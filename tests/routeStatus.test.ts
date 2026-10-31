import { test } from "node:test";
import assert from "node:assert/strict";
import { byAttention, freshnessOf, isUpcoming, localNow, routeFreshness, type Freshness } from "../lib/routeStatus";

const at = (iso: string) => new Date(iso);
const day = (d: string) => new Date(`${d}T00:00:00Z`);

test("local day and time follow each airport's time zone", () => {
  // 23:30 UTC on 31 Oct is already 1 Nov in both zones: 00:30 in Kinshasa (UTC+1), 01:30 in Lubumbashi (UTC+2).
  assert.deepEqual(localNow("Africa/Kinshasa", at("2026-10-31T23:30:00Z")), { day: "2026-11-01", time: "00:30" });
  assert.deepEqual(localNow("Africa/Lubumbashi", at("2026-10-31T23:30:00Z")), { day: "2026-11-01", time: "01:30" });
  assert.deepEqual(localNow("Africa/Kinshasa", at("2026-10-31T12:00:00Z")), { day: "2026-10-31", time: "13:00" });
});

test("a flight is upcoming until its local departure time", () => {
  const now = { day: "2026-11-02", time: "13:45" };
  assert.equal(isUpcoming({ date: day("2026-11-02"), departureTime: "13:45" }, now), true);
  assert.equal(isUpcoming({ date: day("2026-11-02"), departureTime: "13:44" }, now), false);
  assert.equal(isUpcoming({ date: day("2026-11-03"), departureTime: "06:00" }, now), true);
  assert.equal(isUpcoming({ date: day("2026-11-01"), departureTime: "23:00" }, now), false);
});

test("freshness: checked within 7 days, to re-check up to 14, old after", () => {
  const now = at("2026-11-20T12:00:00Z");
  assert.equal(freshnessOf(null, now).state, "never");
  assert.equal(freshnessOf(at("2026-11-20T08:00:00Z"), now).state, "fresh");
  assert.equal(freshnessOf(at("2026-11-13T12:00:00Z"), now).state, "fresh"); // 7 days
  assert.equal(freshnessOf(at("2026-11-12T12:00:00Z"), now).state, "stale"); // 8 days
  assert.equal(freshnessOf(at("2026-11-06T12:00:00Z"), now).state, "stale"); // 14 days
  assert.equal(freshnessOf(at("2026-11-05T12:00:00Z"), now).state, "old"); // 15 days
});

test("a route is as fresh as its least recently checked active airline", () => {
  const now = at("2026-11-20T12:00:00Z");
  const recent = { status: "ACTIVE", verifiedAt: at("2026-11-19T12:00:00Z") };
  const older = { status: "ACTIVE", verifiedAt: at("2026-11-10T12:00:00Z") };
  assert.equal(routeFreshness([], now).state, "none");
  assert.equal(routeFreshness([recent], now).state, "fresh");
  assert.equal(routeFreshness([recent, older], now).state, "stale");
  assert.equal(routeFreshness([recent, { status: "ACTIVE", verifiedAt: null }], now).state, "never");
  // A suspended airline is not checked every week.
  assert.equal(routeFreshness([recent, { status: "SUSPENDED", verifiedAt: null }], now).state, "fresh");
  assert.equal(routeFreshness([{ status: "ENDED", verifiedAt: null }], now).state, "none");
});

test("the board lists what needs work first, then by priority", () => {
  const f = (state: Freshness["state"]): Freshness =>
    state === "never" || state === "none" ? { state } : { state, days: 1, verifiedAt: new Date() };
  const rows = [
    { slug: "fresh-p1", tier: 1, status: "DRAFT", freshness: f("fresh") },
    { slug: "archived", tier: 1, status: "ARCHIVED", freshness: f("never") },
    { slug: "empty-p1", tier: 1, status: "DRAFT", freshness: f("none") },
    { slug: "stale-p2", tier: 2, status: "PUBLISHED", freshness: f("stale") },
    { slug: "never-p3", tier: 3, status: "DRAFT", freshness: f("never") },
    { slug: "old-p1", tier: 1, status: "PUBLISHED", freshness: f("old") },
  ];
  assert.deepEqual(rows.sort(byAttention).map((r) => r.slug), ["old-p1", "never-p3", "stale-p2", "empty-p1", "fresh-p1", "archived"]);
});
