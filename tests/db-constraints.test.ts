/**
 * Schema v3 rules enforced by the database itself (unique keys, CHECK constraints, foreign keys).
 * Runs against the local database only, on its own fixture rows, and removes them afterwards.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client";
import { ensureRoute, ensureRouteAirline, routeIdForCities } from "../lib/routes";

const url = process.env.DATABASE_URL ?? "";
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url ? new URL(url).hostname : "");
const prisma = isLocal ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }) : null;

/** Name of the constraint a write broke, from Prisma's P2002 or the adapter's raw Postgres error. */
function violated(err: unknown): string | undefined {
  const e = err as { meta?: { driverAdapterError?: { cause?: { originalMessage?: string } } }; cause?: { originalMessage?: string } };
  const message = e?.meta?.driverAdapterError?.cause?.originalMessage ?? e?.cause?.originalMessage ?? "";
  return message.match(/constraint "([^"]+)"/)?.[1];
}

async function rejects(write: Promise<unknown>, constraint: string) {
  await assert.rejects(write, (err) => {
    assert.equal(violated(err), constraint);
    return true;
  });
}

describe("schema v3 constraints", { skip: isLocal ? false : "local database only" }, () => {
  const db = prisma!;
  const ids = { airline: "", other: "", a: "", b: "", routeAirline: "" };
  const day = new Date("2030-01-07T00:00:00Z");
  const flight = (data: Partial<Prisma.FlightUncheckedCreateInput>) =>
    db.flight.create({
      data: { routeAirlineId: ids.routeAirline, date: day, departureTime: "08:00", arrivalTime: "10:00", ...data },
    });

  before(async () => {
    await cleanup();
    ids.airline = (await db.airline.create({ data: { code: "Z9", slug: "test-z9", name: "Test Z9" } })).id;
    ids.other = (await db.airline.create({ data: { code: "Z8", slug: "test-z8", name: "Test Z8" } })).id;
    const airport = (code: string, city: string) =>
      db.airport.create({ data: { code, slug: `test-${code.toLowerCase()}`, name: `Test ${code}`, city, timezone: "Africa/Kinshasa" } });
    ids.a = (await airport("ZZA", "Zedville")).id;
    ids.b = (await airport("ZZB", "Zedtown")).id;
    ids.routeAirline = (await ensureRouteAirline(db, { airlineId: ids.airline, originId: ids.a, destinationId: ids.b })).id;
  });

  after(async () => {
    await cleanup();
    await db.$disconnect();
  });

  async function cleanup() {
    const airlines = { code: { in: ["Z9", "Z8"] } };
    const airports = { code: { in: ["ZZA", "ZZB"] } };
    await db.flight.deleteMany({ where: { routeAirline: { airline: airlines } } });
    await db.fareObservation.deleteMany({ where: { routeAirline: { airline: airlines } } });
    await db.routeAirline.deleteMany({ where: { airline: airlines } });
    await db.request.deleteMany({ where: { route: { origin: airports } } });
    await db.route.deleteMany({ where: { OR: [{ origin: airports }, { destination: airports }] } });
    await db.airport.deleteMany({ where: airports });
    await db.airline.deleteMany({ where: airlines });
  }

  test("a flight number departs once a day per route and airline", async () => {
    await flight({ flightNumber: "Z91611", departureTime: "13:45" });
    await rejects(flight({ flightNumber: "Z91611", departureTime: "15:00" }), "Flight_routeAirlineId_date_flightNumber_key");
    // Same number on another day is fine.
    await flight({ flightNumber: "Z91611", departureTime: "13:45", date: new Date("2030-01-08T00:00:00Z") });
  });

  test("two flights cannot leave at the same time, numbered or not", async () => {
    await flight({ departureTime: "06:00" });
    await rejects(flight({ departureTime: "06:00" }), "Flight_routeAirlineId_date_departureTime_key");
    await rejects(flight({ flightNumber: "Z9100", departureTime: "06:00" }), "Flight_routeAirlineId_date_departureTime_key");
    // Unnumbered flights at different times are distinct (Air Congo publishes no numbers).
    await flight({ departureTime: "06:30" });
  });

  test("the same flight on another airline's record is not a duplicate", async () => {
    const other = await ensureRouteAirline(db, { airlineId: ids.other, originId: ids.a, destinationId: ids.b });
    await flight({ routeAirlineId: other.id, flightNumber: "Z91611", departureTime: "13:45" });
  });

  test("times, day offset, flight numbers and stops have one written form", async () => {
    await rejects(flight({ departureTime: "7:45" }), "Flight_times_check");
    await rejects(flight({ departureTime: "07:00", arrivalTime: "24:10" }), "Flight_times_check");
    await rejects(flight({ departureTime: "07:01", arrivalDayOffset: 2 }), "Flight_arrival_day_offset_check");
    await rejects(flight({ departureTime: "07:02", flightNumber: "bu1611" }), "Flight_flight_number_check");
    await rejects(flight({ departureTime: "07:03", flightNumber: "BU 1611" }), "Flight_flight_number_check");
    await rejects(flight({ departureTime: "07:04", via: ["Kindu"] }), "Flight_via_check");
    await flight({ departureTime: "07:05", flightNumber: "BU1257", via: ["KND", "FMI"], arrivalDayOffset: 1 });
  });

  test("a route joins two different airports, with a tier from 1 to 3", async () => {
    await rejects(db.route.create({ data: { originId: ids.a, destinationId: ids.a, slug: "test-loop" } }), "Route_distinct_airports_check");
    const route = await ensureRoute(db, ids.a, ids.b);
    await rejects(db.route.update({ where: { id: route.id }, data: { tier: 4 } }), "Route_tier_check");
    await assert.rejects(ensureRoute(db, ids.a, ids.a));
  });

  test("one record per airline and route, created once", async () => {
    const again = await ensureRouteAirline(db, { airlineId: ids.airline, originId: ids.a, destinationId: ids.b });
    assert.equal(again.id, ids.routeAirline);
    await rejects(
      db.routeAirline.create({ data: { routeId: again.routeId, airlineId: ids.airline } }),
      "RouteAirline_routeId_airlineId_key",
    );
    const route = await db.route.findUniqueOrThrow({ where: { id: again.routeId } });
    assert.equal(route.slug, "test-zza-test-zzb");
    assert.equal(route.status, "DRAFT");
    assert.equal(again.isPublished, false);
  });

  test("an airline-on-route with flights cannot be deleted", async () => {
    await assert.rejects(db.routeAirline.delete({ where: { id: ids.routeAirline } }), (err) => {
      assert.match(violated(err) ?? "", /^Flight_routeAirlineId_fkey$/);
      return true;
    });
  });

  test("requests are matched to a route by airport code or city name", async () => {
    const route = await ensureRoute(db, ids.a, ids.b);
    assert.equal(await routeIdForCities(db, "Zedville (ZZA) · Aéroport", "Zedtown (ZZB) · Aéroport"), route.id);
    assert.equal(await routeIdForCities(db, "  zedville ", "ZEDTOWN"), route.id);
    assert.equal(await routeIdForCities(db, "Zedtown", "Zedville"), null); // the return route does not exist
    assert.equal(await routeIdForCities(db, "Atlantis", "Zedtown"), null);
  });
});
