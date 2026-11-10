/**
 * Server side of the visit statistics (docs/ANALYTICS.md): validates what browsers send, stores it,
 * and credits booking requests to a source. Every function here is allowed to fail: callers catch,
 * and a visitor never sees an analytics error.
 */
import { z } from "zod";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { classify, isKnownSource, type Channel, type Touch } from "./channel";
import { BROWSER_EVENTS, MAX_EVENTS_PER_BATCH, type Batch } from "./events";

type Db = PrismaClient | Prisma.TransactionClient;

const id = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const code = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/);
const short = (n: number) => z.string().trim().max(n).nullable();
const path = z.string().startsWith("/").max(300);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const utm = {
  utmSource: short(100),
  utmMedium: short(100),
  utmCampaign: short(100),
  utmTerm: short(100),
  utmContent: short(100),
};

const EventSchema = z.object({
  id,
  name: z.enum(BROWSER_EVENTS as [string, ...string[]]),
  path,
  routeSlug: code.nullish(),
  airline: code.nullish(),
  origin: z.string().regex(/^[A-Z]{3}$/).nullish(),
  destination: z.string().regex(/^[A-Z]{3}$/).nullish(),
  travelDate: day.nullish(),
  passengers: z.number().int().min(1).max(9).nullish(),
  props: z
    .record(z.string().max(40), z.union([z.string().max(100), z.number(), z.boolean(), z.null()]))
    .refine((p) => Object.keys(p).length <= 8)
    .optional(),
});

export const BatchSchema = z.object({
  visitorId: id,
  session: z.object({
    id,
    isNewVisitor: z.boolean(),
    landingPath: path,
    referrerHost: z.string().max(253).nullable(),
    ...utm,
  }),
  events: z.array(EventSchema).min(1).max(MAX_EVENTS_PER_BATCH),
});

export type Visitor = { hostname: string; device: string; browser: string | null; os: string | null; country: string | null };

/**
 * "mobile" / "tablet" / "desktop" from Next's user-agent reading. A browser with no device type on a
 * phone system (Opera Mini on Android reads as desktop) is a phone; anything else is a desktop.
 */
export const deviceOf = (type: string | undefined, os?: string) =>
  type === "mobile" || type === "tablet" ? type : /^(Android|iOS|KaiOS)$/i.test(os ?? "") ? "mobile" : "desktop";

/**
 * Stores one batch: the session (created on its first batch, then only its last activity moves)
 * and its events. An event id already stored is skipped, so a batch sent twice counts once.
 */
export async function storeBatch(db: Db, batch: Batch, visitor: Visitor, now = new Date()) {
  const s = batch.session;
  const channel = classify(s, visitor.hostname);
  await db.analyticsSession.upsert({
    where: { id: s.id },
    create: {
      id: s.id, visitorId: batch.visitorId, isNewVisitor: s.isNewVisitor, startedAt: now, lastSeenAt: now,
      hostname: visitor.hostname.slice(0, 253), landingPath: s.landingPath, referrerHost: s.referrerHost, channel,
      utmSource: s.utmSource, utmMedium: s.utmMedium, utmCampaign: s.utmCampaign, utmTerm: s.utmTerm, utmContent: s.utmContent,
      device: visitor.device, browser: visitor.browser, os: visitor.os, country: visitor.country,
    },
    update: { lastSeenAt: now },
  });
  await db.analyticsEvent.createMany({
    data: batch.events.map((e) => ({
      id: e.id, name: e.name, occurredAt: now, sessionId: s.id, visitorId: batch.visitorId, path: e.path,
      routeSlug: e.routeSlug ?? null, airline: e.airline ?? null, origin: e.origin ?? null, destination: e.destination ?? null,
      travelDate: e.travelDate ?? null, passengers: e.passengers ?? null, props: e.props ?? undefined,
    })),
    skipDuplicates: true,
  });
}

const TouchSchema = z.object({
  channel: z.string(),
  referrerHost: z.string().max(253).nullable(),
  ...utm,
  landingPath: path,
  at: z.string().datetime(),
});

const AttributionSchema = z.object({
  visitorId: id,
  sessionId: id,
  firstTouch: TouchSchema,
  lastTouch: TouchSchema.nullable(),
  landingPath: path,
  conversionPath: path,
  airline: code.nullish(),
});

/**
 * The columns a booking request gets from what the browser sent with it. Anything missing or
 * malformed gives nulls ("non mesurée"): attribution never makes a request fail.
 * Channels are decided again here from the raw facts; the browser's own label is ignored.
 */
export function requestAttribution(raw: unknown, hostname: string, deviceType: string | undefined, os?: string) {
  const device = deviceOf(deviceType, os);
  const parsed = AttributionSchema.safeParse(raw);
  if (!parsed.success) {
    return { columns: { device, visitorId: null, sessionId: null, firstChannel: null, lastChannel: null, attribution: undefined }, event: null };
  }
  const a = parsed.data;
  const recheck = (t: z.infer<typeof TouchSchema>): Touch => ({ ...t, channel: classify(t, hostname) });
  const first = recheck(a.firstTouch);
  const last = a.lastTouch ? recheck(a.lastTouch) : null;
  // The latest known source; a visitor who only ever came direct is credited to "direct".
  const lastChannel: Channel = last && isKnownSource(last.channel) ? last.channel : first.channel;
  return {
    columns: {
      device,
      visitorId: a.visitorId,
      sessionId: a.sessionId,
      firstChannel: first.channel,
      lastChannel,
      attribution: { firstTouch: first, lastTouch: last, landingPath: a.landingPath, conversionPath: a.conversionPath } as Prisma.InputJsonValue,
    },
    event: { visitorId: a.visitorId, sessionId: a.sessionId, path: a.conversionPath, airline: a.airline ?? null },
  };
}

/** The server's own record of a saved request, in the same table as the browser's events. */
export async function recordSubmitted(
  db: Db,
  request: { id: string; travelDate: Date; travelers: number; route: { slug: string } | null },
  who: { visitorId: string; sessionId: string; path: string; airline: string | null },
) {
  await db.analyticsEvent.createMany({
    data: [{
      id: `request-${request.id}`, name: "booking_request_submitted", sessionId: who.sessionId, visitorId: who.visitorId,
      path: who.path, routeSlug: request.route?.slug ?? null, airline: who.airline,
      travelDate: request.travelDate.toISOString().slice(0, 10), passengers: request.travelers,
    }],
    skipDuplicates: true,
  });
}

/**
 * Best-effort limit per address and server instance (instances do not share memory). Enough to
 * stop one script from filling the table; the address is held in memory for a minute, never stored.
 */
const hits = new Map<string, { count: number; reset: number }>();
export function withinRate(key: string, limit = 60, now = Date.now()) {
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + 60_000 });
    return true;
  }
  h.count++;
  return h.count <= limit;
}
