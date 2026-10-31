/**
 * Removes data left over from before the route model (owner request, 2026-10-31):
 *   1. schedules (FlightPattern) that ended before today
 *   2. fares copied from the old FlightPattern.price column (schema v2 migration)
 *   3. airline-on-route records that are left with nothing: no flights, no fares, never verified,
 *      never published, no notes
 *   4. routes left with nothing: draft, no airline, no request, no note, and not a priority route
 * Requests and contact messages are counted, never deleted.
 *
 * Shows what it would delete and changes nothing, unless --apply is given. With --apply it first
 * writes every row it deletes to a JSON backup in ~/.lebourgeois/backups, then deletes in one
 * transaction and records each deletion in the change log.
 *
 *   npx tsx scripts/clean-legacy-data.ts                         local database, preview
 *   npx tsx scripts/clean-legacy-data.ts --production            production (.env), preview
 *   npx tsx scripts/clean-legacy-data.ts --production --apply    production, delete
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { config, parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PRIORITY_ROUTE_KEYS } from "../lib/priorityRoutes";
import { snapshot } from "../lib/changeLog";

const production = process.argv.includes("--production");
const apply = process.argv.includes("--apply");

// Production reads .env on purpose: .env.local (the local database) wins everywhere else.
let url: string | undefined;
if (production) {
  url = parse(readFileSync(".env")).DATABASE_URL;
} else {
  config({ path: [".env.local", ".env"], quiet: true });
  url = process.env.DATABASE_URL;
}
if (!url) throw new Error("DATABASE_URL is not set");
const host = new URL(url).hostname;
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
if (!isLocal && !production) {
  console.error(`"${host}" is not a local database. Pass --production to target production.`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const ACTOR = "script:clean-legacy-data";
const LEGACY_FARE_NOTE = "Migré depuis FlightPattern.price";

async function main() {
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  console.log(`Database: ${host} (${production ? "production" : "local"}) · ${apply ? "APPLY" : "preview, nothing is changed"}\n`);

  const patterns = await prisma.flightPattern.findMany({
    where: { endDate: { lt: today } },
    include: { airline: { select: { code: true } }, origin: { select: { code: true } }, destination: { select: { code: true } } },
    orderBy: [{ airlineId: "asc" }, { flightNumber: "asc" }],
  });
  const fares = await prisma.fareObservation.findMany({
    where: { note: { startsWith: LEGACY_FARE_NOTE } },
    include: { routeAirline: { include: { airline: { select: { code: true } }, route: { select: { id: true, slug: true } } } } },
  });
  const fareIds = new Set(fares.map((f) => f.id));

  // What is left on each airline-on-route once those fares are gone (patterns are not linked to it).
  const routeAirlines = await prisma.routeAirline.findMany({
    where: { verifiedAt: null, isPublished: false, note: null, bookingUrl: null, flights: { none: {} } },
    include: { fares: { select: { id: true } }, airline: { select: { code: true } }, route: { select: { id: true, slug: true } } },
  });
  const emptyRouteAirlines = routeAirlines.filter((ra) => ra.fares.every((f) => fareIds.has(f.id)));
  const removedRouteAirlineIds = new Set(emptyRouteAirlines.map((ra) => ra.id));

  const routes = await prisma.route.findMany({
    where: { status: "DRAFT", note: null, requests: { none: {} } },
    include: {
      airlines: { select: { id: true } },
      origin: { select: { code: true } },
      destination: { select: { code: true } },
    },
  });
  const emptyRoutes = routes.filter(
    (r) =>
      !PRIORITY_ROUTE_KEYS.has(`${r.origin.code}-${r.destination.code}`) &&
      r.airlines.every((ra) => removedRouteAirlineIds.has(ra.id)),
  );

  const [requests, messages] = await Promise.all([
    prisma.request.findMany({ select: { createdAt: true, clientName: true, originCity: true, destinationCity: true } }),
    prisma.contactMessage.findMany({ select: { createdAt: true, name: true, topic: true } }),
  ]);

  const day = (d: Date) => d.toISOString().slice(0, 10);
  console.log(`1. Expired schedules: ${patterns.length}`);
  for (const p of patterns) {
    console.log(`   ${p.airline.code} ${p.flightNumber} ${p.origin.code}→${p.destination.code} ended ${day(p.endDate)}`);
  }
  console.log(`2. Fares copied from old schedules: ${fares.length}`);
  for (const f of fares) {
    console.log(`   ${f.routeAirline.airline.code} ${f.routeAirline.route.slug} ${f.amount} ${f.currency} (${f.reviewStatus})`);
  }
  console.log(`3. Airline-on-route records left empty: ${emptyRouteAirlines.length}`);
  for (const ra of emptyRouteAirlines) console.log(`   ${ra.airline.code} on ${ra.route.slug}`);
  console.log(`4. Routes left empty (not priority routes): ${emptyRoutes.length}`);
  for (const r of emptyRoutes) console.log(`   ${r.slug}`);
  console.log(`\nKept, for your decision: ${requests.length} requests, ${messages.length} contact messages.`);
  for (const q of requests) console.log(`   request ${day(q.createdAt)} ${q.clientName}: ${q.originCity} → ${q.destinationCity}`);
  for (const m of messages) console.log(`   message ${day(m.createdAt)} ${m.name} (${m.topic})`);

  if (!apply) {
    console.log("\nPreview only. Run again with --apply to delete.");
    return;
  }

  const dir = join(homedir(), ".lebourgeois", "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `clean-legacy-${production ? "production" : "local"}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify({ host, at: new Date(), patterns, fares, routeAirlines: emptyRouteAirlines, routes: emptyRoutes }, null, 2));
  console.log(`\nBackup written: ${file}`);

  const routeIdByPair = new Map(
    (await prisma.route.findMany({ select: { id: true, originId: true, destinationId: true } })).map((r) => [`${r.originId}-${r.destinationId}`, r.id]),
  );
  const logs = [
    ...patterns.map((p) => ({
      actor: ACTOR, entity: "FlightPattern", entityId: p.id, action: "DELETE" as const,
      routeId: routeIdByPair.get(`${p.originId}-${p.destinationId}`) ?? null,
      summary: `Programme expiré ${p.flightNumber} supprimé`, changes: snapshot(p),
    })),
    ...fares.map((f) => ({
      actor: ACTOR, entity: "FareObservation", entityId: f.id, action: "DELETE" as const, routeId: f.routeAirline.route.id,
      summary: `Ancien prix ${f.amount} ${f.currency} supprimé`, changes: snapshot(f),
    })),
    ...emptyRouteAirlines.map((ra) => ({
      actor: ACTOR, entity: "RouteAirline", entityId: ra.id, action: "DELETE" as const, routeId: ra.route.id,
      summary: `${ra.airline.code} retirée de ${ra.route.slug} (plus aucune donnée)`, changes: snapshot(ra),
    })),
    ...emptyRoutes.map((r) => ({
      actor: ACTOR, entity: "Route", entityId: r.id, action: "DELETE" as const, routeId: r.id,
      summary: `Route ${r.slug} supprimée (plus aucune donnée)`, changes: snapshot(r),
    })),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.flightPattern.deleteMany({ where: { id: { in: patterns.map((p) => p.id) } } });
    await tx.fareObservation.deleteMany({ where: { id: { in: fares.map((f) => f.id) } } });
    await tx.routeAirline.deleteMany({ where: { id: { in: emptyRouteAirlines.map((ra) => ra.id) } } });
    await tx.route.deleteMany({ where: { id: { in: emptyRoutes.map((r) => r.id) } } });
    await tx.changeLog.createMany({ data: logs });
  });
  console.log(
    `Deleted ${patterns.length} schedules, ${fares.length} fares, ${emptyRouteAirlines.length} airline-on-route records, ` +
      `${emptyRoutes.length} routes; ${logs.length} change-log entries written.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
