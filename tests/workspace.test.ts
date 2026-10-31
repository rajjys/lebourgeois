/**
 * The route workspace actions against the local database, on fixture rows removed afterwards:
 * the owner's example (ROUTE-MODEL §6.2), then every action undone in turn back to an empty calendar.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL ?? "";
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url ? new URL(url).hostname : "");

describe("route workspace actions", { skip: isLocal ? false : "local database only" }, async () => {
  // Imported after the environment is loaded: lib/prisma reads DATABASE_URL when it loads.
  const { default: prisma } = await import("../lib/prisma");
  const ws = await import("../lib/workspace");
  const { ensureRouteAirline } = await import("../lib/routes");
  const { addDays } = await import("../lib/schedule");
  const { localNow } = await import("../lib/routeStatus");

  const actor = "test";
  let raId = "";
  let routeId = "";
  const et60 = { flightNumber: "ET60", departureTime: "08:00", arrivalTime: "11:30", arrivalDayOffset: 0, via: [], aircraft: null, sourceUrl: null };
  const flights = () =>
    prisma.flight.findMany({ where: { routeAirlineId: raId }, orderBy: [{ date: "asc" }, { departureTime: "asc" }] });
  const days = async () => (await flights()).map((f) => `${f.date.toISOString().slice(0, 10)} ${f.flightNumber ?? "-"} ${f.departureTime} ${f.status}`);

  async function cleanup() {
    const ras = await prisma.routeAirline.findMany({ where: { airline: { code: "Z7" } }, select: { id: true, routeId: true } });
    await prisma.flight.deleteMany({ where: { routeAirlineId: { in: ras.map((r) => r.id) } } });
    await prisma.changeBatch.deleteMany({ where: { routeAirlineId: { in: ras.map((r) => r.id) } } });
    await prisma.changeLog.deleteMany({ where: { routeId: { in: ras.map((r) => r.routeId) } } });
    await prisma.routeAirline.deleteMany({ where: { id: { in: ras.map((r) => r.id) } } });
    await prisma.route.deleteMany({ where: { origin: { code: "ZZC" } } });
    await prisma.airport.deleteMany({ where: { code: { in: ["ZZC", "ZZD", "ZZE"] } } });
    await prisma.airline.deleteMany({ where: { code: "Z7" } });
  }

  before(async () => {
    await cleanup();
    const airline = await prisma.airline.create({ data: { code: "Z7", slug: "test-z7", name: "Test Z7" } });
    const airport = (code: string) =>
      prisma.airport.create({ data: { code, slug: `test-${code.toLowerCase()}`, name: code, city: code, timezone: "Africa/Kinshasa" } });
    const [c, d] = [await airport("ZZC"), await airport("ZZD")];
    await airport("ZZE");
    const ra = await ensureRouteAirline(prisma, { airlineId: airline.id, originId: c.id, destinationId: d.id });
    raId = ra.id;
    routeId = ra.routeId;
  });

  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("preview writes nothing", async () => {
    const { plan, batch } = await ws.applySchedule(raId, { ...et60, days: ["MON", "WED", "SAT"], from: "2030-11-04", to: "2030-11-10" }, actor, false);
    assert.equal(plan.add.length, 3);
    assert.equal(batch, null);
    assert.equal((await flights()).length, 0);
  });

  test("the owner's example: two schedules, typed once each", async () => {
    await ws.applySchedule(raId, { ...et60, days: ["MON", "WED", "SAT"], from: "2030-11-04", to: "2030-11-10" }, actor, true);
    const second = await ws.applySchedule(raId, { ...et60, days: ["TUE", "THU", "SUN"], from: "2030-11-11", to: "2030-11-24" }, actor, true);
    assert.equal(second.plan.add.length, 6);
    assert.equal((await flights()).length, 9);
    assert.match(second.batch!.summary, /^Horaire ET 60 08:00–11:30 \(mardi, jeudi et dimanche\) du 11 nov\. au 24 nov\. : 6 vols ajoutés$/);
    const params = (await prisma.changeBatch.findFirst({ where: { routeAirlineId: raId }, orderBy: { createdAt: "desc" } }))!.params as { days: string[] };
    assert.deepEqual(params.days, ["TUE", "THU", "SUN"]); // what pre-fills the next form
  });

  test("copy a week, cancel, edit a day and verify, each as one batch", async () => {
    const copy = await ws.copyWeek(raId, { weekStart: "2030-11-04", weeks: 2 }, actor, true);
    // Week of 11 Nov already has flights on Tue/Thu/Sun, so only Mon/Wed/Sat are added there; all three the week after.
    assert.equal(copy.plan.add.length, 6);
    await assert.rejects(ws.copyWeek(raId, { weekStart: "2030-11-05", weeks: 1 }, actor, false), /commence un lundi/);

    const cancel = await ws.cancelFlights(raId, { from: "2030-11-18", to: "2030-11-24", days: [], flightNumber: null }, actor, true);
    assert.equal(cancel.flights.length, 6);

    await ws.editDay(raId, { date: "2030-11-04", flights: [{ ...et60, departureTime: "08:15", status: "SCHEDULED" }, { ...et60, flightNumber: "ET62", departureTime: "19:00", via: ["ZZE"], status: "SCHEDULED" }] }, actor);
    const nov4 = (await days()).filter((d) => d.startsWith("2030-11-04"));
    assert.deepEqual(nov4, ["2030-11-04 ET60 08:15 SCHEDULED", "2030-11-04 ET62 19:00 SCHEDULED"]);
    await assert.rejects(
      ws.editDay(raId, { date: "2030-11-05", flights: [{ ...et60, via: ["ZZC"], status: "SCHEDULED" }] }, actor),
      /départ ou l'arrivée/,
    );

    // A flight a few days from now, so that "Tout est vérifié" has something to stamp.
    const soon = addDays(localNow("Africa/Kinshasa").day, 2);
    await ws.editDay(raId, { date: soon, flights: [{ ...et60, status: "SCHEDULED" }] }, actor);
    await prisma.flight.updateMany({ where: { routeAirlineId: raId }, data: { verifiedAt: null } });
    const verified = await ws.verifyAll(raId, { sourceUrl: "https://example.com/horaires" }, actor);
    assert.equal(verified.flights, 1);
    assert.ok((await prisma.routeAirline.findUniqueOrThrow({ where: { id: raId } })).verifiedAt);
  });

  test("a duplicate typed by hand is refused by the database, and nothing is half-written", async () => {
    const before = await days();
    // Bypass planDay's own check: two batches racing for the same number on the same day.
    await assert.rejects(
      prisma.flight.create({ data: { routeAirlineId: raId, date: new Date("2030-11-04T00:00:00Z"), flightNumber: "ET60", departureTime: "06:00", arrivalTime: "07:00" } }),
    );
    assert.deepEqual(await days(), before);
  });

  test("undo, action by action, back to an empty calendar", async () => {
    const batches = await prisma.changeBatch.count({ where: { routeAirlineId: raId, action: { not: "UNDO" } } });
    assert.equal(batches, 7); // 2 schedules, copy, cancel, 2 day edits, verify

    // Undo "verify": the airline-on-route loses its stamp again.
    await ws.undoLatest(raId, actor);
    assert.equal((await prisma.routeAirline.findUniqueOrThrow({ where: { id: raId } })).verifiedAt, null);

    // Undo the two day edits: 4 Nov is back to one ET60 at 08:00.
    await ws.undoLatest(raId, actor);
    await ws.undoLatest(raId, actor);
    assert.deepEqual((await days()).filter((d) => d.startsWith("2030-11-04")), ["2030-11-04 ET60 08:00 SCHEDULED"]);

    // Undo the cancellation: the week of 18 Nov is scheduled again.
    await ws.undoLatest(raId, actor);
    assert.ok((await days()).filter((d) => d >= "2030-11-18").every((d) => d.endsWith("SCHEDULED")));

    await ws.undoLatest(raId, actor); // copy
    assert.equal((await flights()).length, 9);
    await ws.undoLatest(raId, actor); // second schedule
    await ws.undoLatest(raId, actor); // first schedule
    assert.equal((await flights()).length, 0);
    await assert.rejects(ws.undoLatest(raId, actor), /Rien à annuler/);

    const undone = await prisma.changeBatch.count({ where: { routeAirlineId: raId, undoneAt: { not: null } } });
    assert.equal(undone, 7);
    assert.ok((await prisma.changeLog.count({ where: { routeId } })) > 40);
  });
});
