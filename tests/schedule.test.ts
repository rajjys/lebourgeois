import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, mondayOf, planCancel, planCopyWeek, planDay, planSchedule, type StoredFlight } from "../lib/schedule";

const et60 = { flightNumber: "ET60", departureTime: "08:00", arrivalTime: "11:30", arrivalDayOffset: 0, via: [], aircraft: null };
let n = 0;
const stored = (date: string, fields: Partial<StoredFlight> = {}): StoredFlight => ({ ...et60, id: `f${++n}`, date, status: "SCHEDULED", ...fields });

test("the owner's example, step 2: ET 60 on Mon, Wed and Sat from 2 to 8 Nov", () => {
  const plan = planSchedule([], { ...et60, days: ["MON", "WED", "SAT"], from: "2026-11-02", to: "2026-11-08" });
  assert.deepEqual(plan.add.map((f) => f.date), ["2026-11-02", "2026-11-04", "2026-11-07"]);
  assert.equal(plan.add[0].flightNumber, "ET60");
  assert.deepEqual([plan.update.length, plan.unchanged.length, plan.skipped.length], [0, 0, 0]);
});

test("step 3: Tue, Thu and Sun from 9 to 22 Nov leaves the first week alone", () => {
  const week1 = ["2026-11-02", "2026-11-04", "2026-11-07"].map((d) => stored(d));
  const plan = planSchedule(week1, { ...et60, days: ["TUE", "THU", "SUN"], from: "2026-11-09", to: "2026-11-22" });
  assert.equal(plan.add.length, 6);
  assert.ok(plan.add.every((f) => f.date >= "2026-11-09"));
});

test("applying the same schedule twice changes nothing; a new time updates the same flights", () => {
  const week1 = ["2026-11-02", "2026-11-04"].map((d) => stored(d));
  const input = { ...et60, days: ["MON", "WED"] as const, from: "2026-11-02", to: "2026-11-08" };
  assert.deepEqual(planSchedule(week1, { ...input, days: [...input.days] }).unchanged, ["2026-11-02", "2026-11-04"]);
  const retimed = planSchedule(week1, { ...input, days: [...input.days], departureTime: "09:00", arrivalTime: "12:30" });
  assert.equal(retimed.add.length, 0);
  assert.deepEqual(retimed.update.map((u) => [u.id, u.before.departureTime, u.after.departureTime]), [
    [week1[0].id, "08:00", "09:00"],
    [week1[1].id, "08:00", "09:00"],
  ]);
});

test("a cancelled flight stays cancelled, and a time already taken is not doubled", () => {
  const flights = [stored("2026-11-02", { status: "CANCELLED" }), stored("2026-11-04", { flightNumber: "ET62" })];
  const plan = planSchedule(flights, { ...et60, days: ["MON", "WED"], from: "2026-11-02", to: "2026-11-08" });
  assert.deepEqual(plan.skipped, [
    { date: "2026-11-02", reason: "cancelled" },
    { date: "2026-11-04", reason: "time-taken" },
  ]);
  assert.equal(plan.add.length, 0);
});

test("without a number, a flight is recognised by its departure time", () => {
  const unnumbered = { ...et60, flightNumber: null };
  const plan = planSchedule([stored("2026-11-02", { flightNumber: null })], { ...unnumbered, days: ["MON"], from: "2026-11-02", to: "2026-11-09" });
  assert.deepEqual(plan.unchanged, ["2026-11-02"]);
  assert.deepEqual(plan.add.map((f) => f.date), ["2026-11-09"]);
});

test("copying a week skips days that already have flights", () => {
  const week = [stored("2026-11-02"), stored("2026-11-02", { flightNumber: "ET62", departureTime: "19:00" }), stored("2026-11-04"), stored("2026-11-05", { status: "CANCELLED" })];
  const typedLater = stored("2026-11-11", { flightNumber: "ET70" }); // Wednesday of week 2, typed by hand
  const plan = planCopyWeek([...week, typedLater], "2026-11-02", 2);
  assert.deepEqual(plan.add.map((f) => `${f.date} ${f.flightNumber}`), [
    "2026-11-09 ET60",
    "2026-11-09 ET62",
    "2026-11-16 ET60",
    "2026-11-16 ET62",
    "2026-11-18 ET60",
  ]);
  assert.deepEqual(plan.skipped, [{ date: "2026-11-11", reason: "day-taken" }]);
});

test("cancelling by dates, weekdays and flight number", () => {
  const flights = [stored("2026-11-02"), stored("2026-11-03", { flightNumber: "ET62" }), stored("2026-11-09"), stored("2026-11-16", { status: "CANCELLED" })];
  assert.equal(planCancel(flights, { from: "2026-11-01", to: "2026-11-30" }).length, 3);
  assert.deepEqual(planCancel(flights, { from: "2026-11-01", to: "2026-11-30", days: ["MON"] }).map((f) => f.date), ["2026-11-02", "2026-11-09"]);
  assert.deepEqual(planCancel(flights, { from: "2026-11-01", to: "2026-11-30", flightNumber: "ET62" }).map((f) => f.date), ["2026-11-03"]);
});

test("a day edited by hand: kept, changed, removed and new flights", () => {
  const a = stored("2026-11-02");
  const b = stored("2026-11-02", { flightNumber: "ET62", departureTime: "19:00" });
  const result = planDay([a, b], "2026-11-02", [
    { ...a, departureTime: "08:30" },
    { ...et60, flightNumber: "ET64", departureTime: "12:00", status: "SCHEDULED" },
  ]);
  assert.ok(!("error" in result));
  if ("error" in result) return;
  assert.deepEqual(result.update.map((u) => [u.id, u.after.departureTime]), [[a.id, "08:30"]]);
  assert.deepEqual(result.remove.map((f) => f.id), [b.id]);
  assert.deepEqual(result.add.map((f) => f.flightNumber), ["ET64"]);
});

test("a day cannot hold two flights with the same number or time", () => {
  const typed = [
    { ...et60, status: "SCHEDULED" as const },
    { ...et60, departureTime: "10:00", status: "SCHEDULED" as const },
  ];
  assert.deepEqual(planDay([], "2026-11-02", typed), { error: "Deux vols portent le même numéro ce jour-là." });
  assert.deepEqual(planDay([], "2026-11-02", [typed[0], { ...typed[0], flightNumber: "ET62" }]), {
    error: "Deux vols partent à la même heure ce jour-là.",
  });
});

test("week helpers", () => {
  assert.equal(mondayOf("2026-11-04"), "2026-11-02");
  assert.equal(mondayOf("2026-11-08"), "2026-11-02");
  assert.equal(mondayOf("2026-11-02"), "2026-11-02");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
});
