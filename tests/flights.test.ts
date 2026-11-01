import { test } from "node:test";
import assert from "node:assert/strict";
import { arrivalDayOffset, datesOnWeekdays, durationMinutes, formatDuration, normalizeFlightNumber, weekdayOf } from "../lib/flights";
import { formatFlightNumber } from "../lib/format";
import { changedFields } from "../lib/changeLog";
import { codeInText, routeSlug } from "../lib/routes";

test("flight numbers are stored without spaces, uppercase", () => {
  assert.equal(normalizeFlightNumber("bu 1611"), "BU1611");
  assert.equal(normalizeFlightNumber("ET-60"), "ET60");
  assert.equal(normalizeFlightNumber("4H123"), "4H123");
  assert.equal(normalizeFlightNumber("BU0021"), "BU0021");
});

test("an empty flight number means none published; nonsense is rejected", () => {
  assert.equal(normalizeFlightNumber(""), null);
  assert.equal(normalizeFlightNumber("  "), null);
  assert.equal(normalizeFlightNumber(undefined), null);
  assert.equal(normalizeFlightNumber("Air Congo"), undefined);
  assert.equal(normalizeFlightNumber("BU16111"), undefined);
});

test("flight numbers are shown with a space after the designator", () => {
  assert.equal(formatFlightNumber("BU1611"), "BU 1611");
  assert.equal(formatFlightNumber("ET60"), "ET 60");
  assert.equal(formatFlightNumber("bu1611"), "BU 1611");
});

test("the owner's example: Mon/Wed/Sat from 2 to 8 Nov", () => {
  assert.deepEqual(datesOnWeekdays("2026-11-02", "2026-11-08", ["MON", "WED", "SAT"]), [
    "2026-11-02",
    "2026-11-04",
    "2026-11-07",
  ]);
});

test("then Tue/Thu/Sun from 9 to 22 Nov", () => {
  assert.deepEqual(datesOnWeekdays("2026-11-09", "2026-11-22", ["TUE", "THU", "SUN"]), [
    "2026-11-10",
    "2026-11-12",
    "2026-11-15",
    "2026-11-17",
    "2026-11-19",
    "2026-11-22",
  ]);
});

test("date ranges include both ends, cross months and stay empty when reversed", () => {
  assert.deepEqual(datesOnWeekdays("2026-11-30", "2026-12-01", ["MON", "TUE"]), ["2026-11-30", "2026-12-01"]);
  assert.deepEqual(datesOnWeekdays("2026-11-08", "2026-11-02", ["MON"]), []);
  assert.deepEqual(datesOnWeekdays("2026-11-02", "2026-11-08", []), []);
});

test("weekday of a calendar date does not depend on the machine's time zone", () => {
  assert.equal(weekdayOf("2026-11-02"), "MON");
  assert.equal(weekdayOf("2026-11-08"), "SUN");
});

test("arrival is the next day only when the clock time goes back", () => {
  assert.equal(arrivalDayOffset("13:45", "17:15"), 0);
  assert.equal(arrivalDayOffset("23:30", "00:40"), 1);
});

test("change log keeps only the fields that changed, without timestamps", () => {
  const before = { id: "1", status: "OPEN", statusNote: null, since: new Date("2026-06-06T00:00:00Z"), updatedAt: new Date(1) };
  const after = { id: "1", status: "CLOSED", statusNote: "Fermé", since: new Date("2026-06-06T00:00:00Z"), updatedAt: new Date(2) };
  assert.deepEqual(changedFields(before, after), { status: ["OPEN", "CLOSED"], statusNote: [null, "Fermé"] });
});

test("route slugs and airport codes in free text", () => {
  assert.equal(routeSlug("kinshasa", "mbuji-mayi"), "kinshasa-mbuji-mayi");
  assert.equal(codeInText("Beni (BNC) · Aéroport de Beni"), "BNC");
  assert.equal(codeInText("Beni"), undefined);
});

test("duration counts the time difference between Kinshasa and Lubumbashi", () => {
  const KIN = "Africa/Kinshasa";
  const LUB = "Africa/Lubumbashi";
  // CAA's timetable: BU1611 FIH 13:45 → FBM 17:15, BU1612 FBM 10:00 → FIH 11:30. Both are 2 h 30.
  assert.equal(durationMinutes({ departureTime: "13:45", arrivalTime: "17:15", arrivalDayOffset: 0 }, KIN, LUB), 150);
  assert.equal(durationMinutes({ departureTime: "10:00", arrivalTime: "11:30", arrivalDayOffset: 0 }, LUB, KIN), 150);
  assert.equal(durationMinutes({ departureTime: "23:30", arrivalTime: "00:40", arrivalDayOffset: 1 }, KIN, KIN), 70);
  assert.equal(formatDuration(150), "2 h 30");
  assert.equal(formatDuration(120), "2 h");
  assert.equal(formatDuration(45), "45 min");
});
