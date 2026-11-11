/**
 * The numbers behind /dashboard/analytics (AN-2, AN-5; docs/ANALYTICS.md §5). Plain SQL over two
 * small tables and Request; every figure says what it counts:
 * - visitors = distinct visitor ids; visits (sessions) = visits that STARTED in the period, with
 *   all their events; page views = every page shown in those visits;
 * - bounce = a visit with one page view and nothing done (no search, booking form, WhatsApp or
 *   contact click); duration = last activity − arrival (a visit's
 *   last page is open for an unknown time, so durations read short, as in every analytics tool);
 * - requests come from the Request table itself (complete, even when statistics were blocked);
 *   a request's source is its last known source, "direct" never overwriting a known one.
 * Filters (source, campaign, device, route) apply to visits and to requests alike.
 */
import { DateTime } from "luxon";
import { Prisma, type PrismaClient } from "../generated/prisma/client";
import { daysOf, type Period, type Range } from "./period";

export type Filters = { channel: string | null; campaign: string | null; route: string | null; device: string | null };

type Db = PrismaClient;
const n = (v: unknown) => Number(v ?? 0);

/** bigint columns from Postgres become numbers. */
function count<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map(
    (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])) as { [K in keyof T]: T[K] extends bigint ? number : T[K] },
  );
}

/** Doing one of these makes a one-page visit count as engaged, not as a bounce (as GA4 does). */
const ACTIONS = ["flight_search", "booking_request_started", "booking_request_submitted", "whatsapp_click", "contact_click"];

/** Visits that started in the range and match the filters, with their page views and whether they bounced. */
function visits(r: Range, f: Filters) {
  return Prisma.sql`
    SELECT s.*, coalesce(pv.n, 0) AS pages, extract(epoch FROM (s."lastSeenAt" - s."startedAt")) AS seconds,
           (coalesce(pv.n, 0) <= 1 AND coalesce(pv.acts, 0) = 0) AS bounce
    FROM "AnalyticsSession" s
    LEFT JOIN (SELECT "sessionId", count(*) FILTER (WHERE name = 'page_view') AS n,
                      count(*) FILTER (WHERE name IN (${Prisma.join(ACTIONS)})) AS acts
               FROM "AnalyticsEvent" WHERE "occurredAt" >= ${r.start} GROUP BY 1) pv
      ON pv."sessionId" = s.id
    WHERE s."startedAt" >= ${r.start} AND s."startedAt" < ${r.end}
      AND (${f.channel}::text IS NULL OR s.channel = ${f.channel})
      AND (${f.campaign}::text IS NULL OR s."utmCampaign" = ${f.campaign})
      AND (${f.device}::text IS NULL OR s.device = ${f.device})
      AND (${f.route}::text IS NULL OR EXISTS (
        SELECT 1 FROM "AnalyticsEvent" x WHERE x."sessionId" = s.id AND x."routeSlug" = ${f.route}))`;
}

/** Events of those visits. */
const eventsOf = (s: Prisma.Sql) => Prisma.sql`SELECT e.* FROM "AnalyticsEvent" e JOIN (${s}) v ON v.id = e."sessionId"`;

/** Requests made in the range that match the filters (source = last known source), with route and airline. */
function requestsIn(r: Range, f: Filters) {
  return Prisma.sql`
    SELECT q.*, ro.slug AS "routeSlug", al.slug AS "airlineSlug", al.name AS "airlineName"
    FROM "Request" q
    LEFT JOIN "Route" ro ON ro.id = q."routeId"
    LEFT JOIN "Airline" al ON al.code = left(q."flightNumber", 2)
    WHERE q."createdAt" >= ${r.start} AND q."createdAt" < ${r.end}
      AND (${f.channel}::text IS NULL OR q."lastChannel" = ${f.channel})
      AND (${f.campaign}::text IS NULL
           OR q.attribution #>> '{lastTouch,utmCampaign}' = ${f.campaign}
           OR q.attribution #>> '{firstTouch,utmCampaign}' = ${f.campaign})
      AND (${f.device}::text IS NULL OR q.device = ${f.device})
      AND (${f.route}::text IS NULL OR ro.slug = ${f.route})`;
}

async function totals(db: Db, r: Range, f: Filters) {
  const s = visits(r, f);
  const [row] = await db.$queryRaw<Record<string, bigint | number | null>[]>`
    WITH s AS (${s}), e AS (${eventsOf(s)}), q AS (${requestsIn(r, f)})
    SELECT
      (SELECT count(DISTINCT "visitorId") FROM s) AS visitors,
      (SELECT count(DISTINCT "visitorId") FROM s WHERE "isNewVisitor") AS "newVisitors",
      (SELECT count(DISTINCT "visitorId") FROM s WHERE NOT "isNewVisitor") AS "returningVisitors",
      (SELECT count(*) FROM s) AS sessions,
      (SELECT coalesce(sum(pages), 0) FROM s) AS "pageViews",
      (SELECT count(*) FROM s WHERE bounce) AS bounced,
      (SELECT coalesce(avg(seconds), 0) FROM s) AS "avgSeconds",
      (SELECT count(*) FROM e WHERE name = 'whatsapp_click') AS whatsapp,
      (SELECT count(DISTINCT "visitorId") FROM e WHERE name = 'whatsapp_click') AS "whatsappVisitors",
      (SELECT count(*) FROM e WHERE name = 'flight_search') AS searches,
      (SELECT count(DISTINCT "sessionId") FROM e WHERE name = 'booking_request_started') AS starts,
      (SELECT count(*) FROM e WHERE name = 'booking_request_failed') AS failures,
      (SELECT count(*) FROM q) AS requests,
      (SELECT count(*) FROM q WHERE status = 'BOOKED') AS booked,
      (SELECT count(*) FROM q WHERE "visitorId" IS NULL) AS "requestsUnmeasured"`;
  const t = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, n(v)])) as Record<string, number>;
  return {
    visitors: t.visitors,
    newVisitors: t.newVisitors,
    returningVisitors: t.returningVisitors,
    sessions: t.sessions,
    pageViews: t.pageViews,
    bounceRate: t.sessions ? t.bounced / t.sessions : null,
    avgSeconds: t.sessions ? t.avgSeconds : null,
    pagesPerVisit: t.sessions ? t.pageViews / t.sessions : null,
    whatsapp: t.whatsapp,
    whatsappVisitors: t.whatsappVisitors,
    searches: t.searches,
    starts: t.starts,
    failures: t.failures,
    requests: t.requests,
    booked: t.booked,
    requestsUnmeasured: t.requestsUnmeasured,
    // Requests per visitor. Unmeasured requests count too, so it can read slightly high.
    conversion: t.visitors ? t.requests / t.visitors : null,
    bookingRate: t.requests ? t.booked / t.requests : null,
  };
}
export type Totals = Awaited<ReturnType<typeof totals>>;

export type SeriesValues = { visitors: number; sessions: number; pageViews: number; requests: number; bounceRate: number | null; avgSeconds: number | null };
/** `current` is null for the hours of today that have not come yet (nothing to show, not zero). */
export type SeriesPoint = { key: string; current: SeriesValues | null; previous: SeriesValues | null };

/** One value per day (per hour for a single day), the previous period aligned point by point. */
async function series(db: Db, r: Range, f: Filters, hourly: boolean) {
  const local = (col: string) => Prisma.sql`(${Prisma.raw(col)} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Kinshasa')`;
  const bucket = (col: string) => (hourly ? Prisma.sql`to_char(${local(col)}, 'HH24')` : Prisma.sql`to_char(${local(col)}::date, 'YYYY-MM-DD')`);
  const s = visits(r, f);
  const [v, q] = await Promise.all([
    db.$queryRaw<{ key: string; visitors: bigint; sessions: bigint; pageViews: bigint; bounced: bigint; avgSeconds: number | null }[]>`
      WITH s AS (${s})
      SELECT ${bucket('"startedAt"')} AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions,
             coalesce(sum(pages), 0)::bigint AS "pageViews", count(*) FILTER (WHERE bounce) AS bounced, avg(seconds)::float AS "avgSeconds"
      FROM s GROUP BY 1`,
    db.$queryRaw<{ key: string; requests: bigint }[]>`
      WITH q AS (${requestsIn(r, f)}) SELECT ${bucket('"createdAt"')} AS key, count(*) AS requests FROM q GROUP BY 1`,
  ]);
  const byKey = new Map(v.map((x) => [x.key, x]));
  const req = new Map(q.map((x) => [x.key, n(x.requests)]));
  const keys = hourly ? Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")) : daysOf(r);
  return keys.map((key): [string, SeriesValues] => {
    const x = byKey.get(key);
    const sessions = n(x?.sessions);
    return [key, {
      visitors: n(x?.visitors), sessions, pageViews: n(x?.pageViews), requests: req.get(key) ?? 0,
      bounceRate: sessions ? n(x?.bounced) / sessions : null, avgSeconds: sessions ? n(x?.avgSeconds) : null,
    }];
  });
}

export async function loadAnalytics(db: Db, period: Period, f: Filters, now = new Date()) {
  const s = visits(period, f);
  const e = eventsOf(s);
  const q = requestsIn(period, f);
  const hourly = period.days === 1;
  const local = DateTime.fromJSDate(now).setZone("Africa/Kinshasa");
  const isToday = period.to === local.toISODate();
  // A period ending today is not over: it is compared with the period before up to the same elapsed
  // time (today until 20:15 against yesterday until 20:15), not with the whole of it. The chart still
  // draws the previous period in full.
  const elapsed = now.getTime() - period.start.getTime();
  const before: Range = isToday ? { ...period.previous, end: new Date(Math.min(period.previous.end.getTime(), period.previous.start.getTime() + elapsed)) } : period.previous;

  const [
    current, previous, cur, prev, channels, requestChannels, firstChannels, referrers, campaigns, hosts,
    pages, entries, routes, airlines, searches, funnel, devices, browsers, systems, countries,
    statuses, requestDevices, contacts, recent, firstSeen, live,
  ] = await Promise.all([
    totals(db, period, f),
    totals(db, before, f),
    series(db, period, f, hourly),
    series(db, period.previous, f, hourly),
    db.$queryRaw<{ key: string; sessions: bigint; visitors: bigint; bounced: bigint }[]>`
      WITH s AS (${s}) SELECT channel AS key, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors, count(*) FILTER (WHERE bounce) AS bounced
      FROM s GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ key: string | null; requests: bigint; booked: bigint }[]>`
      WITH q AS (${q}) SELECT "lastChannel" AS key, count(*) AS requests, count(*) FILTER (WHERE status = 'BOOKED') AS booked FROM q GROUP BY 1`,
    db.$queryRaw<{ key: string | null; requests: bigint }[]>`
      WITH q AS (${q}) SELECT "firstChannel" AS key, count(*) AS requests FROM q GROUP BY 1`,
    db.$queryRaw<{ key: string; channel: string; sessions: bigint; visitors: bigint }[]>`
      WITH s AS (${s}) SELECT "referrerHost" AS key, min(channel) AS channel, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors
      FROM s WHERE "referrerHost" IS NOT NULL AND channel <> 'internal' GROUP BY 1 ORDER BY 3 DESC LIMIT 20`,
    db.$queryRaw<{ campaign: string | null; source: string | null; medium: string | null; sessions: bigint; visitors: bigint; requests: bigint }[]>`
      WITH s AS (${s}), q AS (${q})
      SELECT "utmCampaign" AS campaign, "utmSource" AS source, "utmMedium" AS medium, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors,
             (SELECT count(*) FROM q WHERE q."sessionId" = ANY(array_agg(s.id))) AS requests
      FROM s WHERE "utmSource" IS NOT NULL OR "utmCampaign" IS NOT NULL OR "utmMedium" IS NOT NULL GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 20`,
    db.$queryRaw<{ key: string; sessions: bigint; visitors: bigint }[]>`
      WITH s AS (${s}) SELECT hostname AS key, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors FROM s GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ key: string; views: bigint; visitors: bigint }[]>`
      WITH e AS (${e}) SELECT path AS key, count(*) AS views, count(DISTINCT "visitorId") AS visitors FROM e WHERE name = 'page_view' GROUP BY 1 ORDER BY 3 DESC, 2 DESC LIMIT 30`,
    db.$queryRaw<{ key: string; sessions: bigint; visitors: bigint; bounced: bigint; converted: bigint }[]>`
      WITH s AS (${s}), e AS (${e})
      SELECT s."landingPath" AS key, count(*) AS sessions, count(DISTINCT s."visitorId") AS visitors, count(*) FILTER (WHERE s.bounce) AS bounced,
             count(*) FILTER (WHERE EXISTS (SELECT 1 FROM e WHERE e."sessionId" = s.id AND e.name = 'booking_request_submitted')) AS converted
      FROM s GROUP BY 1 ORDER BY 2 DESC LIMIT 30`,
    db.$queryRaw<{ slug: string; origin: string | null; destination: string | null; viewers: bigint; views: bigint; searches: bigint; starts: bigint; requests: bigint; booked: bigint }[]>`
      WITH e AS (${e}), q AS (${q}),
           v AS (SELECT "routeSlug" AS slug,
                   count(DISTINCT "visitorId") FILTER (WHERE name = 'route_view') AS viewers,
                   count(*) FILTER (WHERE name = 'route_view') AS views,
                   count(*) FILTER (WHERE name = 'flight_search') AS searches,
                   count(DISTINCT "sessionId") FILTER (WHERE name = 'booking_request_started') AS starts
                 FROM e WHERE "routeSlug" IS NOT NULL GROUP BY 1),
           r AS (SELECT "routeSlug" AS slug, count(*) AS requests, count(*) FILTER (WHERE status = 'BOOKED') AS booked FROM q WHERE "routeSlug" IS NOT NULL GROUP BY 1)
      SELECT coalesce(v.slug, r.slug) AS slug, o.city AS origin, d.city AS destination,
             coalesce(v.viewers, 0) AS viewers, coalesce(v.views, 0) AS views, coalesce(v.searches, 0) AS searches,
             coalesce(v.starts, 0) AS starts, coalesce(r.requests, 0) AS requests, coalesce(r.booked, 0) AS booked
      FROM v FULL JOIN r ON r.slug = v.slug
      LEFT JOIN "Route" ro ON ro.slug = coalesce(v.slug, r.slug)
      LEFT JOIN "Airport" o ON o.id = ro."originId" LEFT JOIN "Airport" d ON d.id = ro."destinationId"
      ORDER BY 4 DESC, 8 DESC, 1 LIMIT 40`,
    db.$queryRaw<{ slug: string; name: string | null; viewers: bigint; views: bigint; starts: bigint; requests: bigint; booked: bigint }[]>`
      WITH e AS (${e}), q AS (${q}),
           v AS (SELECT airline AS slug,
                   count(DISTINCT "visitorId") FILTER (WHERE name = 'flight_option_view') AS viewers,
                   count(*) FILTER (WHERE name = 'flight_option_view') AS views,
                   count(DISTINCT "sessionId") FILTER (WHERE name = 'booking_request_started') AS starts
                 FROM e WHERE airline IS NOT NULL GROUP BY 1),
           r AS (SELECT "airlineSlug" AS slug, count(*) AS requests, count(*) FILTER (WHERE status = 'BOOKED') AS booked FROM q WHERE "airlineSlug" IS NOT NULL GROUP BY 1)
      SELECT coalesce(v.slug, r.slug) AS slug, a.name, coalesce(v.viewers, 0) AS viewers, coalesce(v.views, 0) AS views,
             coalesce(v.starts, 0) AS starts, coalesce(r.requests, 0) AS requests, coalesce(r.booked, 0) AS booked
      FROM v FULL JOIN r ON r.slug = v.slug LEFT JOIN "Airline" a ON a.slug = coalesce(v.slug, r.slug)
      ORDER BY 3 DESC, 6 DESC`,
    db.$queryRaw<{ origin: string; destination: string; originCity: string | null; destinationCity: string | null; searches: bigint; visitors: bigint; slug: string | null; covered: boolean }[]>`
      WITH e AS (${e})
      SELECT e.origin, e.destination, o.city AS "originCity", d.city AS "destinationCity", count(*) AS searches, count(DISTINCT e."visitorId") AS visitors,
             ro.slug, coalesce(bool_or(EXISTS (SELECT 1 FROM "RouteAirline" ra WHERE ra."routeId" = ro.id AND ra."isPublished")), false) AS covered
      FROM e
      LEFT JOIN "Airport" o ON o.code = e.origin LEFT JOIN "Airport" d ON d.code = e.destination
      LEFT JOIN "Route" ro ON ro."originId" = o.id AND ro."destinationId" = d.id
      WHERE e.name = 'flight_search' AND e.origin IS NOT NULL AND e.destination IS NOT NULL
      GROUP BY 1, 2, 3, 4, 7 ORDER BY 5 DESC LIMIT 30`,
    db.$queryRaw<{ visitors: bigint; routeViews: bigint; searches: bigint; started: bigint; submitted: bigint }[]>`
      WITH s AS (${s}), e AS (${e})
      SELECT (SELECT count(DISTINCT "visitorId") FROM s) AS visitors,
             count(DISTINCT "visitorId") FILTER (WHERE name = 'route_view') AS "routeViews",
             count(DISTINCT "visitorId") FILTER (WHERE name = 'flight_search') AS searches,
             count(DISTINCT "visitorId") FILTER (WHERE name = 'booking_request_started') AS started,
             count(DISTINCT "visitorId") FILTER (WHERE name = 'booking_request_submitted') AS submitted
      FROM e`,
    db.$queryRaw<{ key: string; visitors: bigint; sessions: bigint }[]>`
      WITH s AS (${s}) SELECT device AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ key: string | null; visitors: bigint; sessions: bigint }[]>`
      WITH s AS (${s}) SELECT browser AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    db.$queryRaw<{ key: string | null; visitors: bigint; sessions: bigint }[]>`
      WITH s AS (${s}) SELECT os AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    db.$queryRaw<{ key: string | null; visitors: bigint; sessions: bigint }[]>`
      WITH s AS (${s}) SELECT country AS key, count(DISTINCT "visitorId") AS visitors, count(*) AS sessions FROM s GROUP BY 1 ORDER BY 2 DESC LIMIT 20`,
    db.$queryRaw<{ key: string; requests: bigint }[]>`
      WITH q AS (${q}) SELECT status::text AS key, count(*) AS requests FROM q GROUP BY 1`,
    db.$queryRaw<{ key: string | null; requests: bigint }[]>`
      WITH q AS (${q}) SELECT device AS key, count(*) AS requests FROM q GROUP BY 1`,
    db.$queryRaw<{ name: string; kind: string | null; clicks: bigint; visitors: bigint }[]>`
      WITH e AS (${e})
      SELECT name, coalesce(props ->> 'kind', props ->> 'placement') AS kind, count(*) AS clicks, count(DISTINCT "visitorId") AS visitors
      FROM e WHERE name IN ('whatsapp_click', 'contact_click') GROUP BY 1, 2 ORDER BY 3 DESC`,
    db.$queryRaw<{ id: string; createdAt: Date; originCity: string; destinationCity: string; airlineName: string | null; status: string; lastChannel: string | null; device: string | null; travelDate: Date; travelers: number }[]>`
      WITH q AS (${q})
      SELECT id, "createdAt", "originCity", "destinationCity", "airlineName", status::text AS status, "lastChannel", device, "travelDate", travelers
      FROM q ORDER BY "createdAt" DESC LIMIT 8`,
    db.$queryRaw<{ first: Date | null }[]>`SELECT min("startedAt") AS first FROM "AnalyticsSession"`,
    db.$queryRaw<{ visitors: bigint }[]>`
      SELECT count(DISTINCT "visitorId") AS visitors FROM "AnalyticsSession" WHERE "lastSeenAt" > ${new Date(now.getTime() - 30 * 60_000)}`,
  ]);

  const prevByIndex = prev.map(([, v]) => v);
  const isFuture = (key: string) => hourly && isToday && Number(key) > local.hour;
  const requestsBy = (rows: { key: string | null; requests: bigint }[]) => new Map(rows.map((r) => [r.key, n(r.requests)]));

  return {
    period,
    hourly,
    // The headline comparison stops at the same time of day (see `before`).
    comparedToSameTime: isToday,
    current,
    previous,
    // When collection began: earlier days have no visit data at all.
    trackingSince: firstSeen[0]?.first ?? null,
    liveVisitors: n(live[0]?.visitors),
    series: cur.map(([key, values], i): SeriesPoint => ({ key, current: isFuture(key) ? null : values, previous: prevByIndex[i] ?? null })),
    channels: count(channels),
    requestsByLastChannel: requestsBy(requestChannels),
    bookedByLastChannel: new Map(requestChannels.map((r) => [r.key, n(r.booked)])),
    requestsByFirstChannel: requestsBy(firstChannels),
    referrers: count(referrers),
    campaigns: count(campaigns),
    hosts: count(hosts),
    pages: count(pages),
    entries: count(entries),
    routes: count(routes),
    airlines: count(airlines),
    searches: count(searches),
    funnel: count(funnel)[0] ?? { visitors: 0, routeViews: 0, searches: 0, started: 0, submitted: 0 },
    devices: count(devices),
    browsers: count(browsers),
    systems: count(systems),
    countries: count(countries),
    requestsByStatus: requestsBy(statuses),
    requestsByDevice: requestsBy(requestDevices),
    contacts: count(contacts),
    recentRequests: recent,
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
    routes: routes.map((r) => ({ slug: r.slug, label: `${r.origin.city} – ${r.destination.city}` })),
  };
}
export type FilterOptions = Awaited<ReturnType<typeof filterOptions>>;
