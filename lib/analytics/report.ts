/**
 * The numbers behind /dashboard/analytics (AN-2, docs/ANALYTICS.md §5). Plain SQL over two small
 * tables and Request; every count says what it counts:
 * - visitors = distinct visitor ids; sessions = visits; page views = every page shown;
 * - visits are those that STARTED in the period, with all their events;
 * - requests come from the Request table itself (complete, even when statistics were blocked);
 *   a request's source is its last known source, "direct" never overwriting a known one.
 * Filters (source, campaign, device, route) apply to visits and to requests alike.
 */
import { Prisma, type PrismaClient } from "../generated/prisma/client";
import { daysOf, type Period, type Range } from "./period";

export type Filters = { channel: string | null; campaign: string | null; route: string | null; device: string | null };

type Db = PrismaClient;
const n = (v: unknown) => Number(v ?? 0);

/** Visits that started in the range and match the filters. */
function sessionsIn(r: Range, f: Filters) {
  return Prisma.sql`
    SELECT s.* FROM "AnalyticsSession" s
    WHERE s."startedAt" >= ${r.start} AND s."startedAt" < ${r.end}
      AND (${f.channel}::text IS NULL OR s.channel = ${f.channel})
      AND (${f.campaign}::text IS NULL OR s."utmCampaign" = ${f.campaign})
      AND (${f.device}::text IS NULL OR s.device = ${f.device})
      AND (${f.route}::text IS NULL OR EXISTS (
        SELECT 1 FROM "AnalyticsEvent" x WHERE x."sessionId" = s.id AND x."routeSlug" = ${f.route}))`;
}

/** Requests made in the range that match the filters (source = last known source). */
function requestsIn(r: Range, f: Filters) {
  return Prisma.sql`
    SELECT q.*, ro.slug AS "routeSlug" FROM "Request" q
    LEFT JOIN "Route" ro ON ro.id = q."routeId"
    WHERE q."createdAt" >= ${r.start} AND q."createdAt" < ${r.end}
      AND (${f.channel}::text IS NULL OR q."lastChannel" = ${f.channel})
      AND (${f.campaign}::text IS NULL
           OR q.attribution #>> '{lastTouch,utmCampaign}' = ${f.campaign}
           OR q.attribution #>> '{firstTouch,utmCampaign}' = ${f.campaign})
      AND (${f.device}::text IS NULL OR q.device = ${f.device})
      AND (${f.route}::text IS NULL OR ro.slug = ${f.route})`;
}

async function totals(db: Db, r: Range, f: Filters) {
  const [row] = await db.$queryRaw<Record<string, bigint>[]>`
    WITH s AS (${sessionsIn(r, f)}),
         e AS (SELECT e.name, e."sessionId", e."visitorId" FROM "AnalyticsEvent" e JOIN s ON s.id = e."sessionId"),
         q AS (${requestsIn(r, f)})
    SELECT
      (SELECT count(DISTINCT "visitorId") FROM s) AS visitors,
      (SELECT count(*) FROM s WHERE "isNewVisitor") AS "newVisitors",
      (SELECT count(*) FROM s) AS sessions,
      (SELECT count(*) FROM e WHERE name = 'page_view') AS "pageViews",
      (SELECT count(*) FROM e WHERE name = 'whatsapp_click') AS whatsapp,
      (SELECT count(DISTINCT "visitorId") FROM e WHERE name = 'whatsapp_click') AS "whatsappVisitors",
      (SELECT count(*) FROM q) AS requests,
      (SELECT count(*) FROM q WHERE status = 'BOOKED') AS booked,
      (SELECT count(*) FROM q WHERE "visitorId" IS NULL) AS "requestsUnmeasured"`;
  const t = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, n(v)])) as Record<keyof typeof row, number>;
  return {
    visitors: t.visitors, newVisitors: t.newVisitors, sessions: t.sessions, pageViews: t.pageViews,
    whatsapp: t.whatsapp, whatsappVisitors: t.whatsappVisitors, requests: t.requests, booked: t.booked,
    requestsUnmeasured: t.requestsUnmeasured,
    // Requests per 100 visitors. Requests from browsers that were not measured count too, so this
    // can overstate the rate slightly when many visitors block statistics.
    conversion: t.visitors ? t.requests / t.visitors : null,
  };
}
export type Totals = Awaited<ReturnType<typeof totals>>;

export async function loadAnalytics(db: Db, period: Period, f: Filters) {
  const s = sessionsIn(period, f);
  const q = requestsIn(period, f);
  const localDay = (col: Prisma.Sql) => Prisma.sql`to_char((${col} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Kinshasa')::date, 'YYYY-MM-DD')`;

  const [current, previous, daily, dailyRequests, channels, requestChannels, referrers, campaigns, hosts, routes, funnel, devices, browsers, systems, countries, statuses, firstChannels, requestDevices, firstSeen] =
    await Promise.all([
      totals(db, period, f),
      totals(db, period.previous, f),
      db.$queryRaw<{ day: string; visitors: bigint; sessions: bigint }[]>`
        WITH s AS (${s}) SELECT ${localDay(Prisma.sql`"startedAt"`)} AS day, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1`,
      db.$queryRaw<{ day: string; requests: bigint }[]>`
        WITH q AS (${q}) SELECT ${localDay(Prisma.sql`"createdAt"`)} AS day, count(*) AS requests FROM q GROUP BY 1`,
      db.$queryRaw<{ key: string; sessions: bigint; visitors: bigint }[]>`
        WITH s AS (${s}) SELECT channel AS key, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors FROM s GROUP BY 1 ORDER BY 2 DESC`,
      db.$queryRaw<{ key: string | null; requests: bigint }[]>`
        WITH q AS (${q}) SELECT "lastChannel" AS key, count(*) AS requests FROM q GROUP BY 1`,
      db.$queryRaw<{ key: string; channel: string; sessions: bigint; visitors: bigint }[]>`
        WITH s AS (${s}) SELECT "referrerHost" AS key, min(channel) AS channel, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors
        FROM s WHERE "referrerHost" IS NOT NULL AND channel <> 'internal' GROUP BY 1 ORDER BY 3 DESC LIMIT 15`,
      db.$queryRaw<{ campaign: string | null; source: string | null; medium: string | null; sessions: bigint; visitors: bigint }[]>`
        WITH s AS (${s}) SELECT "utmCampaign" AS campaign, "utmSource" AS source, "utmMedium" AS medium, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors
        FROM s WHERE "utmSource" IS NOT NULL OR "utmCampaign" IS NOT NULL OR "utmMedium" IS NOT NULL GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 15`,
      db.$queryRaw<{ key: string; sessions: bigint; visitors: bigint }[]>`
        WITH s AS (${s}) SELECT hostname AS key, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors FROM s GROUP BY 1 ORDER BY 2 DESC`,
      db.$queryRaw<{ slug: string; origin: string | null; destination: string | null; viewers: bigint; views: bigint; searches: bigint; starts: bigint; requests: bigint }[]>`
        WITH s AS (${s}),
             e AS (SELECT e.* FROM "AnalyticsEvent" e JOIN s ON s.id = e."sessionId" WHERE e."routeSlug" IS NOT NULL),
             q AS (${q}),
             v AS (SELECT "routeSlug" AS slug,
                     count(DISTINCT "visitorId") FILTER (WHERE name = 'route_view') AS viewers,
                     count(*) FILTER (WHERE name = 'route_view') AS views,
                     count(*) FILTER (WHERE name = 'flight_search') AS searches,
                     count(DISTINCT "sessionId") FILTER (WHERE name = 'booking_request_started') AS starts
                   FROM e GROUP BY 1),
             r AS (SELECT "routeSlug" AS slug, count(*) AS requests FROM q WHERE "routeSlug" IS NOT NULL GROUP BY 1)
        SELECT coalesce(v.slug, r.slug) AS slug, o.city AS origin, d.city AS destination,
               coalesce(v.viewers, 0) AS viewers, coalesce(v.views, 0) AS views, coalesce(v.searches, 0) AS searches,
               coalesce(v.starts, 0) AS starts, coalesce(r.requests, 0) AS requests
        FROM v FULL JOIN r ON r.slug = v.slug
        LEFT JOIN "Route" ro ON ro.slug = coalesce(v.slug, r.slug)
        LEFT JOIN "Airport" o ON o.id = ro."originId" LEFT JOIN "Airport" d ON d.id = ro."destinationId"
        ORDER BY 4 DESC, 8 DESC, 1 LIMIT 25`,
      db.$queryRaw<{ visitors: bigint; routeViews: bigint; searches: bigint; started: bigint; submitted: bigint }[]>`
        WITH s AS (${s}), e AS (SELECT e.name, e."visitorId" FROM "AnalyticsEvent" e JOIN s ON s.id = e."sessionId")
        SELECT (SELECT count(DISTINCT "visitorId") FROM s) AS visitors,
               count(DISTINCT "visitorId") FILTER (WHERE name = 'route_view') AS "routeViews",
               count(DISTINCT "visitorId") FILTER (WHERE name = 'flight_search') AS searches,
               count(DISTINCT "visitorId") FILTER (WHERE name = 'booking_request_started') AS started,
               count(DISTINCT "visitorId") FILTER (WHERE name = 'booking_request_submitted') AS submitted
        FROM e`,
      db.$queryRaw<{ key: string; visitors: bigint; sessions: bigint }[]>`
        WITH s AS (${s}) SELECT device AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1 ORDER BY 2 DESC`,
      db.$queryRaw<{ key: string | null; visitors: bigint; sessions: bigint }[]>`
        WITH s AS (${s}) SELECT browser AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      db.$queryRaw<{ key: string | null; visitors: bigint; sessions: bigint }[]>`
        WITH s AS (${s}) SELECT os AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      db.$queryRaw<{ key: string | null; visitors: bigint; sessions: bigint }[]>`
        WITH s AS (${s}) SELECT country AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
      db.$queryRaw<{ key: string; requests: bigint }[]>`
        WITH q AS (${q}) SELECT status::text AS key, count(*) AS requests FROM q GROUP BY 1`,
      db.$queryRaw<{ key: string | null; requests: bigint }[]>`
        WITH q AS (${q}) SELECT "firstChannel" AS key, count(*) AS requests FROM q GROUP BY 1`,
      db.$queryRaw<{ key: string | null; requests: bigint }[]>`
        WITH q AS (${q}) SELECT device AS key, count(*) AS requests FROM q GROUP BY 1`,
      db.$queryRaw<{ first: Date | null }[]>`SELECT min("startedAt") AS first FROM "AnalyticsSession"`,
    ]);

  const byDay = new Map(daily.map((d) => [d.day, d]));
  const requestsByDay = new Map(dailyRequests.map((d) => [d.day, n(d.requests)]));
  const count = <T extends Record<string, unknown>>(rows: T[]) =>
    rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])) as { [K in keyof T]: T[K] extends bigint ? number : T[K] });
  const requestsBy = (rows: { key: string | null; requests: bigint }[]) => new Map(rows.map((r) => [r.key, n(r.requests)]));

  return {
    period,
    current,
    previous,
    // When collection began: earlier days have no visit data at all.
    trackingSince: firstSeen[0]?.first ?? null,
    days: daysOf(period).map((day) => ({
      day,
      visitors: n(byDay.get(day)?.visitors),
      sessions: n(byDay.get(day)?.sessions),
      requests: requestsByDay.get(day) ?? 0,
    })),
    channels: count(channels),
    requestsByLastChannel: requestsBy(requestChannels),
    requestsByFirstChannel: requestsBy(firstChannels),
    referrers: count(referrers),
    campaigns: count(campaigns),
    hosts: count(hosts),
    routes: count(routes),
    funnel: count(funnel)[0] ?? { visitors: 0, routeViews: 0, searches: 0, started: 0, submitted: 0 },
    devices: count(devices),
    browsers: count(browsers),
    systems: count(systems),
    countries: count(countries),
    requestsByStatus: requestsBy(statuses),
    requestsByDevice: requestsBy(requestDevices),
  };
}
export type AnalyticsReport = Awaited<ReturnType<typeof loadAnalytics>>;

/** Choices for the filters: campaigns seen in the last year, published routes. */
export async function filterOptions(db: Db) {
  const [campaigns, routes] = await Promise.all([
    db.$queryRaw<{ campaign: string }[]>`
      SELECT DISTINCT "utmCampaign" AS campaign FROM "AnalyticsSession"
      WHERE "utmCampaign" IS NOT NULL AND "startedAt" > now() - interval '365 days' ORDER BY 1 LIMIT 100`,
    db.route.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, origin: { select: { city: true } }, destination: { select: { city: true } } },
      orderBy: { slug: "asc" },
    }),
  ]);
  return {
    campaigns: campaigns.map((c) => c.campaign),
    routes: routes.map((r) => ({ slug: r.slug, label: `${r.origin.city} → ${r.destination.city}` })),
  };
}
