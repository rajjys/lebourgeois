/**
 * Planning the route workspace's bulk actions (docs/ROUTE-MODEL.md §6.2), without touching the
 * database: given the flights already stored for one airline on one route, say what an action
 * would add, change or skip. The API previews these plans and applies them in one batch.
 */
import type { Weekday } from "./generated/prisma/client";
import { datesOnWeekdays, weekdayOf } from "./flights";

/** What the operator types for a flight. Dates are calendar days, "YYYY-MM-DD". */
export type FlightFields = {
  flightNumber: string | null;
  departureTime: string;
  arrivalTime: string;
  arrivalDayOffset: number;
  via: string[];
  aircraft: string | null;
};

export type StoredFlight = FlightFields & { id: string; date: string; status: "SCHEDULED" | "CANCELLED" };

export type ScheduleInput = FlightFields & { days: Weekday[]; from: string; to: string };

export type SkipReason = "cancelled" | "time-taken" | "day-taken";

export type Plan = {
  add: (FlightFields & { date: string })[];
  update: { id: string; date: string; before: FlightFields; after: FlightFields }[];
  unchanged: string[];
  skipped: { date: string; reason: SkipReason }[];
};

const FIELDS = ["flightNumber", "departureTime", "arrivalTime", "arrivalDayOffset", "via", "aircraft"] as const;

export const pickFields = (f: FlightFields): FlightFields => ({
  flightNumber: f.flightNumber,
  departureTime: f.departureTime,
  arrivalTime: f.arrivalTime,
  arrivalDayOffset: f.arrivalDayOffset,
  via: [...f.via],
  aircraft: f.aircraft,
});

export function sameFields(a: FlightFields, b: FlightFields) {
  return FIELDS.every((k) => (k === "via" ? a.via.join(",") === b.via.join(",") : a[k] === b[k]));
}

/**
 * The stored flight a typed flight refers to on one date: same number, or, when there is no
 * number, an unnumbered flight leaving at the same time.
 */
export function matchFlight<T extends StoredFlight>(sameDay: T[], input: FlightFields): T | undefined {
  return input.flightNumber
    ? sameDay.find((f) => f.flightNumber === input.flightNumber)
    : sameDay.find((f) => f.flightNumber === null && f.departureTime === input.departureTime);
}

const byDate = <T extends { date: string }>(flights: T[]) => {
  const map = new Map<string, T[]>();
  for (const f of flights) map.set(f.date, [...(map.get(f.date) ?? []), f]);
  return map;
};

/**
 * "Appliquer un horaire": one flight on the chosen weekdays between two dates.
 * - The same flight already there and identical: unchanged. Different: updated (times, stops…).
 * - Already there but cancelled: left alone, a cancellation is a decision.
 * - Another flight of this airline already leaves at that time: skipped, it would be a duplicate.
 */
export function planSchedule(stored: StoredFlight[], input: ScheduleInput): Plan {
  const plan: Plan = { add: [], update: [], unchanged: [], skipped: [] };
  const flights = pickFields(input);
  const days = byDate(stored);
  for (const date of datesOnWeekdays(input.from, input.to, input.days)) {
    const sameDay = days.get(date) ?? [];
    const match = matchFlight(sameDay, flights);
    const timeTaken = sameDay.some((f) => f !== match && f.departureTime === flights.departureTime);
    if (match?.status === "CANCELLED") plan.skipped.push({ date, reason: "cancelled" });
    else if (timeTaken) plan.skipped.push({ date, reason: "time-taken" });
    else if (!match) plan.add.push({ ...flights, date });
    else if (sameFields(match, flights)) plan.unchanged.push(date);
    else plan.update.push({ id: match.id, date, before: pickFields(match), after: flights });
  }
  return plan;
}

const DAY_MS = 86_400_000;
export const addDays = (day: string, n: number) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);

/** Monday of the week a date falls in. */
export const mondayOf = (day: string) => {
  const index = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].indexOf(weekdayOf(day));
  return addDays(day, -index);
};

/**
 * "Copier une semaine": the scheduled flights of one week, repeated on the next `weeks` weeks.
 * A target day that already has a flight of this airline is skipped whole, so nothing typed
 * by hand is overwritten.
 */
export function planCopyWeek(stored: StoredFlight[], weekStart: string, weeks: number): Plan {
  const plan: Plan = { add: [], update: [], unchanged: [], skipped: [] };
  const weekEnd = addDays(weekStart, 6);
  const source = stored.filter((f) => f.date >= weekStart && f.date <= weekEnd && f.status === "SCHEDULED");
  const occupied = new Set(stored.map((f) => f.date));
  for (let k = 1; k <= weeks; k++) {
    const skippedDays = new Set<string>();
    for (const f of source) {
      const date = addDays(f.date, 7 * k);
      if (occupied.has(date)) {
        if (!skippedDays.has(date)) plan.skipped.push({ date, reason: "day-taken" });
        skippedDays.add(date);
        continue;
      }
      plan.add.push({ ...pickFields(f), date });
    }
  }
  plan.add.sort((a, b) => a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime));
  plan.skipped.sort((a, b) => a.date.localeCompare(b.date));
  return plan;
}

/** "Annuler des vols": the scheduled flights between two dates, optionally on some weekdays or one flight number. */
export function planCancel(
  stored: StoredFlight[],
  filter: { from: string; to: string; days?: Weekday[]; flightNumber?: string | null },
): StoredFlight[] {
  return stored
    .filter(
      (f) =>
        f.status === "SCHEDULED" &&
        f.date >= filter.from &&
        f.date <= filter.to &&
        (!filter.days?.length || filter.days.includes(weekdayOf(f.date))) &&
        (!filter.flightNumber || f.flightNumber === filter.flightNumber),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime));
}

export type DayFlight = FlightFields & { id?: string; status: "SCHEDULED" | "CANCELLED" };

/**
 * A day edited by hand: the list typed replaces what was stored for that date.
 * Returns the writes, or the first problem (two flights with the same number or the same time).
 */
export function planDay(stored: StoredFlight[], date: string, typed: DayFlight[]) {
  const numbers = typed.map((f) => f.flightNumber).filter(Boolean);
  if (new Set(numbers).size !== numbers.length) return { error: "Deux vols portent le même numéro ce jour-là." } as const;
  const times = typed.map((f) => f.departureTime);
  if (new Set(times).size !== times.length) return { error: "Deux vols partent à la même heure ce jour-là." } as const;

  const sameDay = stored.filter((f) => f.date === date);
  const keptIds = new Set(typed.map((f) => f.id).filter(Boolean));
  const remove = sameDay.filter((f) => !keptIds.has(f.id));
  const add: (DayFlight & { date: string })[] = [];
  const update: { id: string; before: StoredFlight; after: DayFlight }[] = [];
  for (const f of typed) {
    const current = f.id ? sameDay.find((s) => s.id === f.id) : undefined;
    if (f.id && !current) return { error: "Un vol a été modifié entre-temps. Rechargez la page." } as const;
    if (!current) add.push({ ...f, date });
    else if (!sameFields(current, f) || current.status !== f.status) update.push({ id: current.id, before: current, after: f });
  }
  return { add, update, remove } as const;
}
