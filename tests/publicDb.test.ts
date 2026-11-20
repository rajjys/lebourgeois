/** The public data cache (O-14, lib/publicDb.ts): what goes in comes out the same; writes are refused. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "../lib/generated/prisma/client";
import publicDb, { decode, encode } from "../lib/publicDb";

test("dates and decimals come back as dates and decimals, nested at any depth", () => {
  const row = {
    id: "f1",
    date: new Date("2026-11-23T00:00:00.000Z"),
    via: ["KWZ"],
    amount: new Prisma.Decimal("250.50"),
    statusSince: null,
    routeAirline: { verifiedAt: new Date("2026-11-19T20:41:00.123Z"), airline: { name: "CAA", logo: null } },
    fares: [{ amount: new Prisma.Decimal("199"), observedAt: new Date("2026-11-13T09:00:00Z") }],
    _count: 3,
    _max: { updatedAt: new Date("2026-11-19T21:00:00Z") },
  };
  // Through JSON, as the data cache stores it.
  const back = decode(JSON.parse(JSON.stringify(encode(row)))) as typeof row;
  assert.ok(back.date instanceof Date);
  assert.equal(back.date.toISOString(), "2026-11-23T00:00:00.000Z");
  assert.ok(Prisma.Decimal.isDecimal(back.amount));
  assert.equal(back.amount.toString(), "250.5");
  assert.equal(Number(back.fares[0].amount), 199);
  assert.ok(back.routeAirline.verifiedAt instanceof Date);
  assert.equal(back.routeAirline.verifiedAt.getTime(), row.routeAirline.verifiedAt.getTime());
  assert.ok(back._max.updatedAt instanceof Date);
  assert.deepEqual({ ...back, date: 0, amount: 0, routeAirline: 0, fares: 0, _max: 0 }, { ...row, date: 0, amount: 0, routeAirline: 0, fares: 0, _max: 0 });
});

test("plain values, empty results and counts pass through untouched", () => {
  for (const v of [null, 0, 17, "x", true, [], {}, [{ routeAirlineId: "a", _count: 2 }]]) {
    assert.deepEqual(decode(JSON.parse(JSON.stringify(encode(v)))), v);
  }
});

test("publicDb only reads", () => {
  assert.throws(() => (publicDb.flight as unknown as { create: unknown }).create, /read-only: flight\.create/);
  assert.throws(() => (publicDb.route as unknown as { update: unknown }).update, /read-only/);
  assert.throws(() => (publicDb.fareObservation as unknown as { deleteMany: unknown }).deleteMany, /read-only/);
  assert.equal(typeof publicDb.flight.findMany, "function");
});
