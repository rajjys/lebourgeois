/**
 * DEMO visit statistics for the LOCAL database only, so the Statistiques page can be designed and
 * reviewed with realistic volumes (docs/ANALYTICS.md). Nothing here is real data.
 *
 *   npx tsx scripts/seed-dev-analytics.ts           replaces the demo rows (90 days up to today)
 *   npx tsx scripts/seed-dev-analytics.ts --clear   removes them
 *
 * Every row it writes is marked: ids start with "demo-", demo requests are named "DÉMO statistiques".
 * The mix (sources, routes, devices) follows Vercel's export of 3–10 Nov 2026 and DRC browsing habits.
 */
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client";

const url = parse(readFileSync(".env.local")).DATABASE_URL;
if (!url || !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname)) {
  console.error("Local database only (.env.local).");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const DEMO_NAME = "DÉMO statistiques";

// Deterministic randomness: the same demo every run.
let seed = 20261110;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function pick<T>(weighted: [T, number][]): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of weighted) if ((r -= w) <= 0) return v;
  return weighted[weighted.length - 1][0];
}
const chance = (p: number) => rand() < p;
const id = (kind: string) => `demo-${kind}-${Math.floor(rand() * 1e12).toString(36)}${Math.floor(rand() * 1e12).toString(36)}`;

const ROUTES: [string, number][] = [
  ["kinshasa-lubumbashi", 11], ["lubumbashi-kinshasa", 10], ["lubumbashi-kalemie", 7], ["kalemie-lubumbashi", 4],
  ["kinshasa-kisangani", 4], ["lubumbashi-mbuji-mayi", 4], ["kindu-kalemie", 3], ["kinshasa-kindu", 3],
  ["kolwezi-lubumbashi", 3], ["mbandaka-kinshasa", 3], ["kalemie-kananga", 3], ["kinshasa-gemena", 2],
  ["kinshasa-kananga", 2], ["mbuji-mayi-kinshasa", 2], ["kisangani-kinshasa", 2], ["kolwezi-kinshasa", 2],
  ["kinshasa-mbuji-mayi", 2], ["lubumbashi-kolwezi", 2], ["mbuji-mayi-kolwezi", 2], ["kalemie-kindu", 2],
];
const CHANNELS: [{ channel: string; referrerHost: string | null; utm?: [string, string, string] }, number][] = [
  [{ channel: "search", referrerHost: "www.google.com" }, 48],
  [{ channel: "search", referrerHost: "www.google.cd" }, 6],
  [{ channel: "search", referrerHost: "www.bing.com" }, 2],
  [{ channel: "direct", referrerHost: null }, 24],
  [{ channel: "whatsapp", referrerHost: null, utm: ["whatsapp", "social", "groupe-lubumbashi"] }, 5],
  [{ channel: "whatsapp", referrerHost: "com.whatsapp" }, 2],
  [{ channel: "social", referrerHost: "l.facebook.com" }, 5],
  [{ channel: "social", referrerHost: null, utm: ["facebook", "social", "kalemie-nov"] }, 2],
  [{ channel: "ai", referrerHost: "chatgpt.com" }, 2],
  [{ channel: "referral", referrerHost: "actualite.cd" }, 2],
  [{ channel: "referral", referrerHost: "ss.ginksearch.com" }, 1],
  [{ channel: "campaign", referrerHost: null, utm: ["flyer", "print", "aeroport-ndjili"] }, 1],
];
const DEVICES: [{ device: string; browser: string; os: string }, number][] = [
  [{ device: "mobile", browser: "Chrome", os: "Android" }, 46],
  [{ device: "mobile", browser: "Opera Mini", os: "Android" }, 8],
  [{ device: "mobile", browser: "Samsung Browser", os: "Android" }, 7],
  [{ device: "mobile", browser: "Facebook", os: "Android" }, 4],
  [{ device: "mobile", browser: "Mobile Safari", os: "iOS" }, 11],
  [{ device: "mobile", browser: "Firefox", os: "KaiOS" }, 1],
  [{ device: "tablet", browser: "Chrome", os: "Android" }, 3],
  [{ device: "desktop", browser: "Chrome", os: "Windows" }, 12],
  [{ device: "desktop", browser: "Edge", os: "Windows" }, 3],
  [{ device: "desktop", browser: "Safari", os: "Mac OS" }, 3],
  [{ device: "desktop", browser: "Firefox", os: "Linux" }, 1],
];
const COUNTRIES: [string | null, number][] = [["CD", 84], ["BE", 3], ["FR", 3], ["ZA", 2], ["US", 2], ["ZM", 1], ["AO", 1], ["CG", 1], [null, 3]];
const HOSTS: [string, number][] = [["lebourgeois.cd", 92], ["clerikaa.vercel.app", 7], ["lebourgeois.vercel.app", 1]];
const PAGES: [string, number][] = [["/", 10], ["/vols", 4], ["/about", 2], ["/contact", 1]];

async function clear() {
  const e = await prisma.analyticsEvent.deleteMany({ where: { id: { startsWith: "demo-" } } });
  const s = await prisma.analyticsSession.deleteMany({ where: { id: { startsWith: "demo-" } } });
  const r = await prisma.request.deleteMany({ where: { clientName: DEMO_NAME } });
  console.log(`Removed ${s.count} demo visits, ${e.count} events, ${r.count} requests.`);
}

async function main() {
  await clear();
  if (process.argv.includes("--clear")) return;

  const routes = await prisma.route.findMany({
    where: { slug: { in: ROUTES.map(([s]) => s) } },
    select: { id: true, slug: true, origin: { select: { code: true, city: true } }, destination: { select: { code: true, city: true } }, airlines: { where: { isPublished: true }, select: { airline: { select: { slug: true, code: true } } } } },
  });
  const bySlug = new Map(routes.map((r) => [r.slug, r]));
  const routeWeights = ROUTES.filter(([s]) => bySlug.get(s)?.airlines.length);

  const sessions: Prisma.AnalyticsSessionCreateManyInput[] = [];
  const events: Prisma.AnalyticsEventCreateManyInput[] = [];
  const requests: Prisma.RequestCreateManyInput[] = [];
  const visitors: { id: string; first: { channel: string; referrerHost: string | null; utm?: [string, string, string] }; device: (typeof DEVICES)[number][0]; country: string | null }[] = [];

  const now = new Date();
  const DAYS = 90;
  for (let d = DAYS - 1; d >= 0; d--) {
    const dayStart = new Date(now.getTime() - d * 86_400_000);
    dayStart.setUTCHours(0, 0, 0, 0);
    const weekday = dayStart.getUTCDay();
    // Growing traffic (search pages being indexed), quieter on Sundays.
    const base = 6 + (DAYS - d) * 0.32;
    const count = Math.round(base * (weekday === 0 ? 0.65 : weekday === 6 ? 0.85 : 1) * (0.8 + rand() * 0.4));
    for (let i = 0; i < count; i++) {
      // Kinshasa daytime (UTC+1): most visits between 06:00 and 22:00 local.
      const hour = Math.min(23, Math.max(0, Math.round(pick([[6, 2], [8, 6], [10, 8], [12, 8], [14, 7], [16, 7], [18, 8], [20, 6], [22, 2]] as [number, number][]) - 1 + rand() * 2)));
      const startedAt = new Date(dayStart.getTime() + (hour - 1) * 3_600_000 + Math.floor(rand() * 3_600_000));
      if (startedAt > now) continue;
      const returning = visitors.length > 10 && chance(0.24);
      const visitor = returning
        ? visitors[Math.floor(rand() * visitors.length)]
        : { id: id("v"), first: pick(CHANNELS), device: pick(DEVICES), country: pick(COUNTRIES) };
      if (!returning) visitors.push(visitor);
      const source = returning && chance(0.6) ? { channel: "direct", referrerHost: null } as (typeof CHANNELS)[number][0] : returning ? pick(CHANNELS) : visitor.first;

      const sessionId = id("s");
      const route = bySlug.get(pick(routeWeights))!;
      const landsOnRoute = source.channel === "search" ? chance(0.82) : chance(0.45);
      const landingPath = landsOnRoute ? (chance(0.35) ? `/vols/${route.slug}/${route.airlines[Math.floor(rand() * route.airlines.length)].airline.slug}` : `/vols/${route.slug}`) : pick(PAGES);
      const pages = chance(0.42) ? 1 : 1 + Math.ceil(rand() * 5);
      const duration = pages === 1 ? Math.floor(rand() * 40_000) : Math.floor(30_000 + rand() * 420_000);
      sessions.push({
        id: sessionId, visitorId: visitor.id, isNewVisitor: !returning, startedAt, lastSeenAt: new Date(startedAt.getTime() + duration),
        hostname: pick(HOSTS), landingPath, referrerHost: source.referrerHost, channel: source.channel,
        utmSource: source.utm?.[0] ?? null, utmMedium: source.utm?.[1] ?? null, utmCampaign: source.utm?.[2] ?? null, utmTerm: null, utmContent: null,
        device: visitor.device.device, browser: visitor.device.browser, os: visitor.device.os, country: visitor.country,
      });

      let t = startedAt.getTime();
      const step = () => new Date((t += Math.floor(duration / (pages + 1))));
      const ev = (name: string, path: string, extra: Partial<Prisma.AnalyticsEventCreateManyInput> = {}) =>
        events.push({ id: id("e"), name, sessionId, visitorId: visitor.id, path, occurredAt: step(), ...extra });
      const visitRoute = (slug: string, airline: string | null) => {
        const path = airline ? `/vols/${slug}/${airline}` : `/vols/${slug}`;
        ev("page_view", path, { routeSlug: slug, airline });
        ev("route_view", path, { routeSlug: slug, airline });
        if (airline) ev("flight_option_view", path, { routeSlug: slug, airline });
      };

      // First page, then the rest of the visit.
      const firstAirline = landingPath.split("/")[3] ?? null;
      if (landingPath.startsWith("/vols/")) visitRoute(route.slug, firstAirline);
      else ev("page_view", landingPath);
      let current = route;
      for (let p = 1; p < pages; p++) {
        if (chance(0.25)) {
          // A search, sometimes for a pair we don't serve.
          const target = chance(0.85) ? bySlug.get(pick(routeWeights))! : null;
          if (target) {
            ev("flight_search", "/vols", { origin: target.origin.code, destination: target.destination.code, routeSlug: target.slug });
            ev("flight_search_results_view", `/vols/${target.slug}`, { routeSlug: target.slug });
            visitRoute(target.slug, null);
            current = target;
          } else {
            const [o, dd] = pick([[["FIH", "GOM"], 3], [["FBM", "BNC"], 1], [["FIH", "BUX"], 1], [["FIH", "LAD"], 1]] as [[string, string], number][]);
            ev("flight_search", "/", { origin: o, destination: dd });
          }
        } else if (chance(0.55)) {
          visitRoute(current.slug, current.airlines[Math.floor(rand() * current.airlines.length)].airline.slug);
        } else {
          ev("page_view", pick(PAGES));
        }
      }
      // Booking requests, WhatsApp and contact.
      const airline = current.airlines[Math.floor(rand() * current.airlines.length)].airline;
      if (pages > 1 && chance(0.13)) {
        const path = `/vols/${current.slug}/${airline.slug}`;
        const travelDate = new Date(startedAt.getTime() + Math.floor(1 + rand() * 20) * 86_400_000).toISOString().slice(0, 10);
        ev("booking_request_started", path, { routeSlug: current.slug, airline: airline.slug, origin: current.origin.code, destination: current.destination.code, travelDate });
        if (chance(0.06)) ev("booking_request_failed", path, { routeSlug: current.slug, airline: airline.slug });
        else if (chance(0.48)) {
          const requestId = id("r");
          const passengers = pick([[1, 6], [2, 3], [3, 1]] as [number, number][]);
          ev("booking_request_submitted", path, { routeSlug: current.slug, airline: airline.slug, travelDate, passengers });
          const touch = (c: typeof source) => ({ channel: c.channel, referrerHost: c.referrerHost, utmSource: c.utm?.[0] ?? null, utmMedium: c.utm?.[1] ?? null, utmCampaign: c.utm?.[2] ?? null, utmTerm: null, utmContent: null, landingPath, at: startedAt.toISOString() });
          const lastKnown = source.channel !== "direct" ? source : visitor.first.channel !== "direct" ? visitor.first : null;
          requests.push({
            id: requestId, clientName: DEMO_NAME, clientPhone: "+243000000000", flightNumber: `${airline.code}${1400 + Math.floor(rand() * 300)}`,
            originCity: current.origin.city, destinationCity: current.destination.city, travelDate: new Date(`${travelDate}T00:00:00Z`),
            travelClass: "economy", travelers: passengers, routeId: current.id, source: "flight-detail", createdAt: new Date(t),
            status: d > 10 ? pick([["BOOKED", 4], ["CLOSED", 3], ["CONTACTED", 2], ["NEW", 1]] as [Prisma.RequestCreateManyInput["status"], number][]) : pick([["NEW", 3], ["CONTACTED", 2], ["BOOKED", 1]] as [Prisma.RequestCreateManyInput["status"], number][]),
            visitorId: visitor.id, sessionId, firstChannel: visitor.first.channel, lastChannel: (lastKnown ?? visitor.first).channel,
            device: visitor.device.device,
            attribution: { firstTouch: touch(visitor.first), lastTouch: lastKnown ? touch(lastKnown) : null, landingPath, conversionPath: path },
          });
        }
      }
      if (chance(0.05)) ev("whatsapp_click", landingPath, { props: { placement: pick([["footer", 3], ["header", 2], ["main", 2]] as [string, number][]) } });
      if (chance(0.015)) ev("contact_click", "/contact", { props: { kind: pick([["form", 3], ["email", 1], ["phone", 1]] as [string, number][]) } });
    }
  }

  for (let i = 0; i < sessions.length; i += 1000) await prisma.analyticsSession.createMany({ data: sessions.slice(i, i + 1000) });
  for (let i = 0; i < events.length; i += 2000) await prisma.analyticsEvent.createMany({ data: events.slice(i, i + 2000) });
  await prisma.request.createMany({ data: requests });
  console.log(`Demo: ${visitors.length} visitors, ${sessions.length} visits, ${events.length} events, ${requests.length} requests over ${DAYS} days (local only).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
