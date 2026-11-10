import { test } from "node:test";
import assert from "node:assert/strict";
import type { StoredFlight } from "../lib/schedule";
import { blockedAdditions, planTimetable, trips, wantedFlights, type Timetable } from "../lib/timetable";
import { caa20261111 } from "../data/timetables/caa-2026-11-11";

const tt = (legs: Timetable["legs"]): Timetable => ({ airline: "BU", label: "test", sourceUrl: "https://example.test/t.pdf", validFrom: "2026-11-09", readOn: "2026-11-08", legs });
let n = 0;
const stored = (date: string, f: Partial<StoredFlight>): StoredFlight => ({
  id: `s${++n}`, date, status: "SCHEDULED", flightNumber: "BU1611", departureTime: "13:45", arrivalTime: "17:15",
  arrivalDayOffset: 0, via: [], aircraft: null, ...f,
});

test("legs of one flight number make the through trips, with their stops", () => {
  const out = trips([
    { days: ["MON"], flight: "BU1414", from: "FIH", to: "MJM", dep: "09:00", arr: "11:40" },
    { days: ["MON"], flight: "BU1414", from: "MJM", to: "FBM", dep: "12:25", arr: "13:45" },
  ]);
  assert.deepEqual(
    out.map((t) => `${t.from}-${t.to} ${t.dep}-${t.arr} ${t.via.join(",")}`).sort(),
    ["FIH-FBM 09:00-13:45 MJM", "FIH-MJM 09:00-11:40 ", "MJM-FBM 12:25-13:45 "],
  );
});

test("a loop back to the start is not a trip (BU1256 FIH→KND→FKI→FIH)", () => {
  const out = trips([
    { days: ["THU"], flight: "BU1256", from: "FIH", to: "KND", dep: "13:00", arr: "16:00" },
    { days: ["THU"], flight: "BU1256", from: "KND", to: "FKI", dep: "16:45", arr: "17:45" },
    { days: ["THU"], flight: "BU1256", from: "FKI", to: "FIH", dep: "18:30", arr: "19:30" },
  ]);
  assert.ok(out.every((t) => t.from !== t.to));
  assert.deepEqual(out.map((t) => `${t.from}-${t.to}`).sort(), ["FIH-FKI", "FIH-KND", "FKI-FIH", "KND-FIH", "KND-FKI"]);
});

test("same flight confirmed, changed times updated, dropped flights removed, new ones added", () => {
  const legs: Timetable["legs"] = [
    { days: ["TUE", "WED"], flight: "BU1611", from: "FIH", to: "FBM", dep: "13:45", arr: "17:15" },
    { days: ["SUN"], flight: "BU1613", from: "FIH", to: "FBM", dep: "18:30", arr: "22:00" },
  ];
  const { flights } = wantedFlights(tt(legs), "2026-11-09", "2026-11-15");
  const db = [
    stored("2026-11-10", {}), // Tue, identical → confirmed
    stored("2026-11-11", { departureTime: "12:00", arrivalTime: "15:30" }), // Wed, retimed → updated
    stored("2026-11-09", { flightNumber: "BU1671", departureTime: "16:30", arrivalTime: "20:00" }), // Mon, gone → removed
  ];
  const plan = planTimetable(db, flights);
  assert.deepEqual(plan.confirm.map((c) => c.date), ["2026-11-10"]);
  assert.deepEqual(plan.update.map((u) => [u.date, u.before.departureTime, u.after.departureTime]), [["2026-11-11", "12:00", "13:45"]]);
  assert.deepEqual(plan.remove.map((r) => r.flightNumber), ["BU1671"]);
  assert.deepEqual(plan.add.map((a) => [a.date, a.flightNumber]), [["2026-11-15", "BU1613"]]);
});

test("a cancelled flight is kept as it is, and blocks an addition at its time", () => {
  const legs: Timetable["legs"] = [{ days: ["TUE"], flight: "BU1611", from: "FIH", to: "FBM", dep: "13:45", arr: "17:15" }];
  const { flights } = wantedFlights(tt(legs), "2026-11-09", "2026-11-15");
  const same = planTimetable([stored("2026-11-10", { status: "CANCELLED" })], flights);
  assert.equal(same.keptCancelled.length, 1);
  assert.equal(same.add.length + same.update.length + same.remove.length, 0);
  const other = planTimetable([stored("2026-11-10", { status: "CANCELLED", flightNumber: "BU1699" })], flights);
  assert.equal(other.keptCancelled.length, 1);
  assert.equal(blockedAdditions(other).length, 1);
});

test("two flights swapping times on one day become a removal and an addition, not a clashing update", () => {
  const legs: Timetable["legs"] = [
    { days: ["MON"], flight: "BU1", from: "FIH", to: "FBM", dep: "10:00", arr: "13:30" },
    { days: ["MON"], flight: "BU2", from: "FIH", to: "FBM", dep: "08:00", arr: "11:30" },
  ];
  const { flights } = wantedFlights(tt(legs), "2026-11-09", "2026-11-09");
  const db = [
    stored("2026-11-09", { flightNumber: "BU1", departureTime: "08:00", arrivalTime: "11:30" }),
    stored("2026-11-09", { flightNumber: "BU2", departureTime: "10:00", arrivalTime: "13:30" }),
  ];
  const plan = planTimetable(db, flights);
  assert.equal(plan.update.length, 0);
  assert.equal(plan.remove.length, 2);
  assert.deepEqual(plan.add.map((a) => `${a.flightNumber} ${a.departureTime}`).sort(), ["BU1 10:00", "BU2 08:00"]);
});

test("CAA 11 Nov 2026: no duplicates, no Luanda, Monday without the A330, through trips on the 1256 loops", () => {
  const { flights, duplicates } = wantedFlights(caa20261111, "2026-11-16", "2026-11-22"); // Mon → Sun
  assert.equal(duplicates.length, 0);
  assert.ok(flights.every((f) => !f.pair.includes("LAD")));
  const monday = flights.filter((f) => f.date === "2026-11-16");
  assert.ok(monday.every((f) => !["BU1611", "BU1612", "BU1613", "BU1614"].includes(f.flightNumber!)));
  assert.ok(flights.some((f) => f.date === "2026-11-22" && f.pair === "FIH-KND" && f.flightNumber === "BU1256" && f.via.join() === "FKI"));
  const sundayFihFbm = flights.filter((f) => f.date === "2026-11-22" && f.pair === "FIH-FBM").map((f) => `${f.flightNumber} ${f.departureTime}`);
  assert.deepEqual(sundayFihFbm, ["BU1611 10:55", "BU1613 18:30"]);
});
