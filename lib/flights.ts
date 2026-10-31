/**
 * Flights on dates (docs/ROUTE-MODEL.md §5.1). Pure helpers, shared by the back office,
 * scripts and tests. The same rules are enforced by CHECK constraints in the schema v3 migration.
 */
import type { Weekday } from "./generated/prisma/client";

/** Local time, 24 h: "07:45". */
export const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** Stored form: designator (2 letters or digits) + 1 to 4 digits + optional suffix: "BU1611", "ET60", "4H123". */
export const FLIGHT_NUMBER_RE = /^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$/;

/**
 * "bu 1611", "BU-1611" → "BU1611". Empty → null (the airline publishes no number).
 * Returns undefined when the text is not a flight number, so callers can reject it.
 */
export function normalizeFlightNumber(input: string | null | undefined): string | null | undefined {
  const value = (input ?? "").toUpperCase().replace(/[\s-]+/g, "");
  if (value === "") return null;
  return FLIGHT_NUMBER_RE.test(value) ? value : undefined;
}

const WEEKDAYS: Weekday[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]; // getUTCDay() order

/** Day of the week of a calendar date ("2026-11-02" → "MON"). */
export function weekdayOf(day: string): Weekday {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}

/**
 * Calendar dates from `from` to `to` (both included, "YYYY-MM-DD") that fall on `days`.
 * The core of "Appliquer un horaire": Mon/Wed/Sat from 2 to 8 Nov → 2, 4 and 7 Nov.
 */
export function datesOnWeekdays(from: string, to: string, days: readonly Weekday[]): string[] {
  const wanted = new Set(days);
  const out: string[] = [];
  const end = new Date(`${to}T00:00:00Z`).getTime();
  for (let d = new Date(`${from}T00:00:00Z`); d.getTime() <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (wanted.has(WEEKDAYS[d.getUTCDay()])) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * 1 when the arrival clock time is earlier than the departure, i.e. it lands the next day.
 * Enough for domestic flights: the time difference is at most one hour and nobody departs
 * around midnight; an unusual flight is corrected by hand.
 */
export const arrivalDayOffset = (departure: string, arrival: string) => (arrival < departure ? 1 : 0);
