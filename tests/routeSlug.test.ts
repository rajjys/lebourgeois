import { test } from "node:test";
import assert from "node:assert/strict";
import { dateParam, splitRouteSlug, timeParam } from "../lib/routeSlug";
import { airlineRouteHref } from "../lib/links";
import { shortAirlineName } from "../lib/format";

const slugs = new Set(["kinshasa", "lubumbashi", "mbuji-mayi", "kolwezi", "goma"]);

test("route slugs split into two known airports, hyphenated names included", () => {
  assert.deepEqual(splitRouteSlug("kinshasa-lubumbashi", slugs), ["kinshasa", "lubumbashi"]);
  assert.deepEqual(splitRouteSlug("kinshasa-mbuji-mayi", slugs), ["kinshasa", "mbuji-mayi"]);
  assert.deepEqual(splitRouteSlug("mbuji-mayi-kolwezi", slugs), ["mbuji-mayi", "kolwezi"]);
});

test("unknown airports, a route to itself and junk are refused", () => {
  assert.equal(splitRouteSlug("kinshasa-paris", slugs), null);
  assert.equal(splitRouteSlug("kinshasa-kinshasa", slugs), null);
  assert.equal(splitRouteSlug("kinshasa", slugs), null);
  assert.equal(splitRouteSlug("-kinshasa", slugs), null);
});

test("dates in the address", () => {
  assert.equal(dateParam("2026-11-03"), "2026-11-03");
  assert.equal(dateParam("2026-13-03"), null);
  assert.equal(dateParam("demain"), null);
  assert.equal(dateParam(undefined), null);
  assert.equal(dateParam(["2026-11-03"]), null);
});

test("departure times in the address", () => {
  assert.equal(timeParam("08:00"), "08:00");
  assert.equal(timeParam("23:59"), "23:59");
  assert.equal(timeParam("24:00"), null);
  assert.equal(timeParam("8:00"), null);
  assert.equal(timeParam(undefined), null);
});

test("airline page links carry the departure only with a date", () => {
  assert.equal(airlineRouteHref("kinshasa-lubumbashi", "caa"), "/vols/kinshasa-lubumbashi/caa");
  assert.equal(airlineRouteHref("kinshasa-lubumbashi", "caa", "2026-11-02"), "/vols/kinshasa-lubumbashi/caa?date=2026-11-02");
  assert.equal(airlineRouteHref("kinshasa-lubumbashi", "caa", "2026-11-02", "14:00"), "/vols/kinshasa-lubumbashi/caa?date=2026-11-02&heure=14:00");
  assert.equal(airlineRouteHref("kinshasa-lubumbashi", "caa", null, "14:00"), "/vols/kinshasa-lubumbashi/caa");
});

test("airlines are named the way people search for them", () => {
  assert.equal(shortAirlineName("Compagnie Africaine d'Aviation (CAA)"), "CAA");
  assert.equal(shortAirlineName("Air Congo"), "Air Congo");
});
