/**
 * Prices and notes in the route workspace (RW-4), against the local database on fixture rows
 * removed afterwards: add, review, delete and note, each undone in turn.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL ?? "";
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url ? new URL(url).hostname : "");

describe("prices and notes", { skip: isLocal ? false : "local database only" }, async () => {
  const { default: prisma } = await import("../lib/prisma");
  const ws = await import("../lib/workspace");
  const { ensureRouteAirline } = await import("../lib/routes");
  const { FareSchema } = await import("../lib/validations/schedule");

  const actor = "test";
  let raId = "";
  const fares = () => prisma.fareObservation.findMany({ where: { routeAirlineId: raId }, orderBy: { observedAt: "asc" } });
  const statuses = async () => (await fares()).map((f) => `${Number(f.amount)} ${f.reviewStatus}`).sort();

  async function cleanup() {
    const ras = await prisma.routeAirline.findMany({ where: { airline: { code: "Z6" } }, select: { id: true, routeId: true } });
    const ids = ras.map((r) => r.id);
    await prisma.fareObservation.deleteMany({ where: { routeAirlineId: { in: ids } } });
    await prisma.changeBatch.deleteMany({ where: { routeAirlineId: { in: ids } } });
    await prisma.changeLog.deleteMany({ where: { routeId: { in: ras.map((r) => r.routeId) } } });
    await prisma.routeAirline.deleteMany({ where: { id: { in: ids } } });
    await prisma.route.deleteMany({ where: { origin: { code: "ZZF" } } });
    await prisma.airport.deleteMany({ where: { code: { in: ["ZZF", "ZZG"] } } });
    await prisma.airline.deleteMany({ where: { code: "Z6" } });
  }

  before(async () => {
    await cleanup();
    const airline = await prisma.airline.create({ data: { code: "Z6", slug: "test-z6", name: "Test Z6" } });
    const airport = (code: string) =>
      prisma.airport.create({ data: { code, slug: `test-${code.toLowerCase()}`, name: code, city: code, timezone: "Africa/Kinshasa" } });
    const [f, g] = [await airport("ZZF"), await airport("ZZG")];
    raId = (await ensureRouteAirline(prisma, { airlineId: airline.id, originId: f.id, destinationId: g.id })).id;
    // Two prices waiting for review, as an import would leave them.
    for (const amount of [219, 225]) {
      await prisma.fareObservation.create({
        data: { routeAirlineId: raId, amount, kind: "FROM_PRICE", observedAt: new Date("2026-10-01T00:00:00Z"), source: "AIRLINE_WEBSITE", reviewStatus: "PENDING" },
      });
    }
  });

  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("the form: amount required and positive, a comma or a typo in the flight number caught", () => {
    assert.equal(FareSchema.safeParse({ amount: "" }).success, false);
    assert.equal(FareSchema.safeParse({ amount: "-5" }).success, false);
    assert.equal(FareSchema.safeParse({ amount: "244" }).data?.amount, 244);
    assert.equal(FareSchema.safeParse({ amount: "244", flightNumber: "Air Congo" }).success, false);
    assert.equal(FareSchema.safeParse({ amount: "244", flightNumber: "et 60" }).data?.flightNumber, "ET60");
  });

  test("a price typed by the operator is validated at once", async () => {
    const { batch } = await ws.addFare(raId, { amount: 244, fareName: "Economy", sourceUrl: "https://example.com/tarifs", observedAt: null, travelDate: null, flightNumber: null, roundTrip: false, note: null }, actor);
    assert.match(batch!.summary, /^Prix ajouté : 244\s\$ \(Economy\), observé le /);
    const added = (await fares()).find((f) => Number(f.amount) === 244)!;
    assert.equal(added.reviewStatus, "APPROVED");
    assert.equal(added.kind, "FROM_PRICE");
  });

  test("a price for one flight date is a quote", async () => {
    await ws.addFare(raId, { amount: 260, fareName: null, sourceUrl: null, observedAt: "2026-10-30", travelDate: "2026-11-10", flightNumber: "ET60", roundTrip: true, note: "agence, par téléphone" }, actor);
    const quote = (await fares()).find((f) => Number(f.amount) === 260)!;
    assert.deepEqual([quote.kind, quote.tripType, quote.flightNumber, quote.travelDate?.toISOString().slice(0, 10)], ["QUOTE", "ROUND_TRIP", "ET60", "2026-11-10"]);
  });

  test("pending prices are validated or rejected, never reviewed twice", async () => {
    const pending = (await fares()).filter((f) => f.reviewStatus === "PENDING");
    await ws.reviewFares(raId, { ids: [pending[0].id], decision: "APPROVED" }, actor);
    await ws.reviewFares(raId, { ids: [pending[1].id], decision: "REJECTED" }, actor);
    assert.deepEqual(await statuses(), ["219 APPROVED", "225 REJECTED", "244 APPROVED", "260 APPROVED"]);
    await assert.rejects(ws.reviewFares(raId, { ids: [pending[0].id], decision: "REJECTED" }, actor), /Aucun prix à valider/);
  });

  test("a price entered by mistake is deleted; the note is edited", async () => {
    const mistake = (await fares()).find((f) => Number(f.amount) === 260)!;
    await ws.deleteFare(raId, mistake.id, actor);
    assert.equal((await fares()).length, 3);
    await ws.editNote(raId, { note: "Bagages : 23 kg en soute." }, actor);
    assert.equal((await prisma.routeAirline.findUniqueOrThrow({ where: { id: raId } })).note, "Bagages : 23 kg en soute.");
    assert.equal((await ws.editNote(raId, { note: "Bagages : 23 kg en soute." }, actor)).batch, null); // unchanged: nothing written
  });

  test("each step undone in turn", async () => {
    await ws.undoLatest(raId, actor); // note
    assert.equal((await prisma.routeAirline.findUniqueOrThrow({ where: { id: raId } })).note, null);
    await ws.undoLatest(raId, actor); // delete
    const back = (await fares()).find((f) => Number(f.amount) === 260)!;
    assert.deepEqual([back.kind, back.tripType, back.note], ["QUOTE", "ROUND_TRIP", "agence, par téléphone"]);
    await ws.undoLatest(raId, actor); // reject
    await ws.undoLatest(raId, actor); // approve
    assert.deepEqual(await statuses(), ["219 PENDING", "225 PENDING", "244 APPROVED", "260 APPROVED"]);
    await ws.undoLatest(raId, actor); // quote
    await ws.undoLatest(raId, actor); // 244
    assert.deepEqual(await statuses(), ["219 PENDING", "225 PENDING"]);
    await assert.rejects(ws.undoLatest(raId, actor), /Rien à annuler/);
  });
});
