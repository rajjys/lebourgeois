import { test } from "node:test";
import assert from "node:assert/strict";
import { groupServices, sortServices, type Price, type SearchFlight, type Service } from "../lib/searchResults";

const flight = (id: string, date: string, f: Partial<SearchFlight> = {}): SearchFlight => ({
  id, date, routeAirlineId: "caa", flightNumber: "BU1611", departureTime: "13:45", arrivalTime: "17:15", arrivalDayOffset: 0, via: [], ...f,
});
const price = (amount: number): Price => ({ amount, currency: "USD", observedAt: "2026-10-30T00:00:00Z", kind: "FROM_PRICE", tripType: "ONE_WAY", fareName: null, sourceUrl: null });
const extra = (prices: Record<string, number> = {}) => ({
  date: null as string | null,
  airline: (id: string) => ({ code: id === "caa" ? "BU" : "4H", name: id, logo: null }),
  price: (id: string) => (prices[id] ? price(prices[id]) : null),
  city: (code: string) => ({ MJM: "Mbuji-Mayi" })[code] ?? code,
  duration: (f: SearchFlight) => (f.via.length ? 255 : 150),
});

// CAA flies BU1611 Tue–Sat at 13:45; Air Congo flies every day at 08:00 without a number.
const week = [
  flight("a1", "2026-11-03"), flight("a2", "2026-11-04"), flight("a3", "2026-11-07"),
  flight("b1", "2026-11-02", { routeAirlineId: "ac", flightNumber: null, departureTime: "08:00", arrivalTime: "11:30" }),
  flight("b2", "2026-11-03", { routeAirlineId: "ac", flightNumber: null, departureTime: "08:00", arrivalTime: "11:30" }),
  flight("c1", "2026-11-02", { flightNumber: "BU1414", departureTime: "11:15", arrivalTime: "16:00", via: ["MJM"] }),
];

test("one card per service, with the weekdays it flies and its next departure", () => {
  const services = groupServices(week, extra());
  assert.equal(services.length, 3);
  const bu1611 = services.find((s) => s.flightNumber === "BU1611")!;
  assert.deepEqual(bu1611.days, ["TUE", "WED", "SAT"]);
  assert.deepEqual(bu1611.next, { flightId: "a1", date: "2026-11-03" });
  assert.deepEqual(services.find((s) => s.flightNumber === "BU1414")!.via, [{ code: "MJM", city: "Mbuji-Mayi" }]);
});

test("with a date, only services flying that day, pointing at that day's flight", () => {
  const services = groupServices(week, { ...extra(), date: "2026-11-03" });
  assert.deepEqual(services.map((s) => s.next.flightId).sort(), ["a1", "b2"]);
});

test("the four orders", () => {
  const services = groupServices(week, extra({ caa: 255, ac: 245 }));
  const order = (sort: Parameters<typeof sortServices>[1]) => sortServices(services, sort).map((s: Service) => s.next.flightId);
  assert.deepEqual(order("soonest"), ["b1", "c1", "a1"]); // Mon 08:00, Mon 11:15, Tue 13:45
  assert.deepEqual(order("cheapest"), ["b1", "c1", "a1"]); // Air Congo 245 $, then CAA 255 $ by departure
  assert.deepEqual(order("fastest"), ["b1", "a1", "c1"]); // the stop via Mbuji-Mayi is longest
  assert.deepEqual(order("best"), ["b1", "a1", "c1"]); // direct first; Air Congo is sooner and cheaper
});

test("a service without a price goes last when sorting by price", () => {
  const services = groupServices(week, extra({ caa: 255 }));
  assert.deepEqual(sortServices(services, "cheapest").map((s) => s.next.flightId), ["c1", "a1", "b1"]);
});
