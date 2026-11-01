/**
 * Copies the local preview data (routes, airlines on routes, upcoming flights, prices) into
 * another database, normally production, for the team to review (owner request, 2026-11-01).
 *
 * Only adds what is missing: nothing in the target is changed or deleted. Matching is by
 * airport codes, airline code, and for flights by date and number (or departure time).
 * Each airline-on-route's import is one "Appliquer un horaire" batch, so the route workspace's
 * "Défaire" removes it if the review rejects it.
 *
 * Airlines-on-route are created unpublished, except those of the airlines named in --publish=:
 * nothing else appears on the public site before someone switches "Publiée" on in the workspace.
 *
 *   npx tsx scripts/push-preview-to-production.ts --production                         preview
 *   npx tsx scripts/push-preview-to-production.ts --production --apply                 copy, unpublished
 *   npx tsx scripts/push-preview-to-production.ts --production --apply --publish=BU    copy, CAA published
 * Testing: TARGET_DATABASE_URL=<local database> instead of --production.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { config, parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client";
import { localNow } from "../lib/routeStatus";
import { routeSlug } from "../lib/routes";

const production = process.argv.includes("--production");
const apply = process.argv.includes("--apply");
// Airline codes whose new airline-on-route records are published at once, e.g. --publish=BU
const publishCodes = new Set((process.argv.find((a) => a.startsWith("--publish="))?.split("=")[1] ?? "").split(",").filter(Boolean));

const isLocalUrl = (url: string) => ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);

config({ path: [".env.local"], quiet: true });
const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl || !isLocalUrl(sourceUrl)) throw new Error("The source must be the local database (.env.local)");
const targetUrl = production ? parse(readFileSync(".env")).DATABASE_URL : process.env.TARGET_DATABASE_URL;
if (!targetUrl) throw new Error("No target: pass --production, or TARGET_DATABASE_URL for a local test");
if (!production && !isLocalUrl(targetUrl)) throw new Error("TARGET_DATABASE_URL must be local; use --production for production");
if (targetUrl === sourceUrl) throw new Error("Source and target are the same database");

const source = new PrismaClient({ adapter: new PrismaPg({ connectionString: sourceUrl }) });
const target = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
const ACTOR = "script:push-preview-to-production";
const day = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const today = localNow("Africa/Kinshasa").day;
  console.log(`Target: ${new URL(targetUrl!).hostname} (${production ? "production" : "test"}) · ${apply ? "APPLY" : "preview, nothing is changed"}${publishCodes.size ? ` · published: ${[...publishCodes].join(", ")}` : " · unpublished"}`);
  console.log(`Flights from ${today} on.\n`);

  // Local: every airline-on-route with upcoming flights or with prices.
  const local = await source.routeAirline.findMany({
    where: { OR: [{ flights: { some: { date: { gte: new Date(`${today}T00:00:00Z`) } } } }, { fares: { some: {} } }] },
    include: {
      airline: { select: { code: true } },
      route: { include: { origin: { select: { code: true } }, destination: { select: { code: true } } } },
      flights: { where: { date: { gte: new Date(`${today}T00:00:00Z`) } }, orderBy: [{ date: "asc" }, { departureTime: "asc" }] },
      fares: true,
    },
  });

  const [airports, airlines] = await Promise.all([
    target.airport.findMany({ select: { id: true, code: true, slug: true } }),
    target.airline.findMany({ select: { id: true, code: true } }),
  ]);
  const airportBy = new Map(airports.map((a) => [a.code, a]));
  const airlineBy = new Map(airlines.map((a) => [a.code, a]));

  const totals = { routes: 0, routeAirlines: 0, flights: 0, skippedFlights: 0, fares: 0 };
  for (const ra of local.sort((a, b) => a.route.slug.localeCompare(b.route.slug) || a.airline.code.localeCompare(b.airline.code))) {
    const o = airportBy.get(ra.route.origin.code);
    const d = airportBy.get(ra.route.destination.code);
    const al = airlineBy.get(ra.airline.code);
    if (!o || !d || !al) {
      console.log(`  skip ${ra.airline.code} ${ra.route.slug}: airport or airline missing in the target`);
      continue;
    }
    const route = await target.route.findUnique({ where: { originId_destinationId: { originId: o.id, destinationId: d.id } } });
    const targetRa = route ? await target.routeAirline.findUnique({ where: { routeId_airlineId: { routeId: route.id, airlineId: al.id } } }) : null;
    const existing = targetRa
      ? await target.flight.findMany({ where: { routeAirlineId: targetRa.id, date: { gte: new Date(`${today}T00:00:00Z`) } } })
      : [];
    const taken = new Set(existing.flatMap((f) => [`${day(f.date)}|t${f.departureTime}`, f.flightNumber ? `${day(f.date)}|n${f.flightNumber}` : ""]));
    const flights = ra.flights.filter((f) => !taken.has(`${day(f.date)}|t${f.departureTime}`) && !(f.flightNumber && taken.has(`${day(f.date)}|n${f.flightNumber}`)));
    const existingFares = targetRa ? await target.fareObservation.findMany({ where: { routeAirlineId: targetRa.id } }) : [];
    const fareKey = (f: { amount: unknown; observedAt: Date; sourceUrl: string | null }) => `${Number(f.amount)}|${f.observedAt.toISOString()}|${f.sourceUrl ?? ""}`;
    const fares = ra.fares.filter((f) => !existingFares.some((e) => fareKey(e) === fareKey(f)));

    totals.routes += route ? 0 : 1;
    totals.routeAirlines += targetRa ? 0 : 1;
    totals.flights += flights.length;
    totals.skippedFlights += ra.flights.length - flights.length;
    totals.fares += fares.length;
    if (!route || !targetRa || flights.length || fares.length) {
      console.log(
        `  ${ra.airline.code} ${ra.route.slug}: ${route ? "" : "new route (P" + ra.route.tier + "), "}${targetRa ? "" : "new airline on route, "}` +
          `${flights.length} flights${ra.flights.length - flights.length ? ` (${ra.flights.length - flights.length} already there)` : ""}, ${fares.length} prices`,
      );
    }
    if (!apply || (route && targetRa && flights.length === 0 && fares.length === 0)) continue;

    await target.$transaction(
      async (tx) => {
        const r =
          route ??
          (await tx.route.create({
            data: { originId: o.id, destinationId: d.id, slug: routeSlug(o.slug, d.slug), tier: ra.route.tier, note: ra.route.note },
          }));
        const t =
          targetRa ??
          (await tx.routeAirline.create({
            data: {
              routeId: r.id,
              airlineId: al.id,
              status: ra.status,
              isPublished: publishCodes.has(ra.airline.code),
              note: ra.note,
              verifiedAt: ra.verifiedAt,
              verifiedSourceUrl: ra.verifiedSourceUrl,
            },
          }));
        if (flights.length) {
          const batch = await tx.changeBatch.create({
            data: {
              actor: ACTOR,
              routeId: r.id,
              routeAirlineId: t.id,
              action: "APPLY_SCHEDULE",
              summary: `Horaires importés depuis l'aperçu local (${ra.flights[0]?.sourceUrl ? new URL(ra.flights[0].sourceUrl).hostname.replace(/^www\./, "") : "saisie"}) : ${flights.length} vols à revoir`,
            },
          });
          const rows: Prisma.FlightCreateManyInput[] = flights.map((f) => ({
            id: randomUUID(),
            routeAirlineId: t.id,
            date: f.date,
            flightNumber: f.flightNumber,
            departureTime: f.departureTime,
            arrivalTime: f.arrivalTime,
            arrivalDayOffset: f.arrivalDayOffset,
            via: f.via,
            aircraft: f.aircraft,
            status: f.status,
            source: f.source,
            sourceUrl: f.sourceUrl,
            verifiedAt: f.verifiedAt,
            reviewStatus: f.reviewStatus,
            batchId: batch.id,
          }));
          await tx.flight.createMany({ data: rows });
          await tx.changeLog.createMany({
            data: rows.map((row) => ({
              actor: ACTOR,
              entity: "Flight",
              entityId: row.id!,
              action: "CREATE" as const,
              routeId: r.id,
              batchId: batch.id,
              summary: `Vol ${row.flightNumber ?? "sans numéro"} du ${day(row.date as Date)} importé`,
              changes: JSON.parse(JSON.stringify(row)),
            })),
          });
        }
        for (const f of fares) {
          const fare = await tx.fareObservation.create({
            data: {
              routeAirlineId: t.id,
              amount: f.amount,
              currency: f.currency,
              kind: f.kind,
              tripType: f.tripType,
              cabin: f.cabin,
              fareName: f.fareName,
              flightNumber: f.flightNumber,
              travelDate: f.travelDate,
              observedAt: f.observedAt,
              source: f.source,
              sourceUrl: f.sourceUrl,
              note: f.note,
              reviewStatus: "PENDING", // a person validates every imported price
            },
          });
          await tx.changeLog.create({
            data: { actor: ACTOR, entity: "FareObservation", entityId: fare.id, action: "CREATE", routeId: r.id, summary: `Prix importé à valider : ${Number(f.amount)} ${f.currency}`, changes: JSON.parse(JSON.stringify(fare)) },
          });
        }
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
  }

  console.log(
    `\n${apply ? "Done" : "Would add"}: ${totals.routes} routes, ${totals.routeAirlines} airlines on routes (published: ${publishCodes.size ? [...publishCodes].join(", ") : "none"}), ` +
      `${totals.flights} flights (${totals.skippedFlights} already there), ${totals.fares} prices (to validate).`,
  );
  if (!apply) console.log("Preview only. Run again with --apply to copy.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([source.$disconnect(), target.$disconnect()]));
