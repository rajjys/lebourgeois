/**
 * Airline timetables typed in from their documents (e.g. CAA's weekly PDF), turned into the
 * dated flights the site stores, and compared with what a database already holds.
 * Pure: shared by scripts/update-timetable.ts, scripts/load-dev-timetables.ts and the tests.
 */
import type { Weekday } from "./generated/prisma/client";
import { arrivalDayOffset, datesOnWeekdays } from "./flights";
import { sameFields, type FlightFields, type StoredFlight } from "./schedule";

/** One printed row: a leg flown on some weekdays. `flight` is "" when the airline prints no number. */
export type Leg = { days: Weekday[]; flight: string; from: string; to: string; dep: string; arr: string; aircraft?: string };

/** One way to travel from `from` to `to` on a weekday: a single leg, or several legs of one flight number. */
export type Trip = { day: Weekday; flight: string | null; from: string; to: string; dep: string; arr: string; via: string[]; aircraft?: string };

/** A timetable document as typed in: who, where it was read, from when it applies, and its rows. */
export type Timetable = {
  airline: string; // Airline.code, e.g. "BU"
  label: string; // shown in change summaries, e.g. "CAA du 11 nov. 2026"
  sourceUrl: string;
  validFrom: string; // first date the document covers, "YYYY-MM-DD"
  readOn: string; // day the document was read, "YYYY-MM-DD"
  legs: Leg[];
};

/**
 * Every trip a day's legs offer. The legs of one flight number that follow each other
 * (BU1414 FIH→MJM, then MJM→FBM) also make the through trips (FIH→FBM via MJM), the way
 * ROUTE-MODEL §5.3 stores them. Unnumbered legs stay single: nothing says they connect.
 */
export function trips(legs: Leg[]): Trip[] {
  const out: Trip[] = [];
  const byFlight = new Map<string, Leg[]>();
  for (const leg of legs) {
    for (const day of leg.days) {
      if (!leg.flight) {
        out.push({ day, flight: null, from: leg.from, to: leg.to, dep: leg.dep, arr: leg.arr, via: [], aircraft: leg.aircraft });
        continue;
      }
      const key = `${day}|${leg.flight}`;
      byFlight.set(key, [...(byFlight.get(key) ?? []), leg]);
    }
  }
  for (const [key, group] of byFlight) {
    const day = key.split("|")[0] as Weekday;
    group.sort((a, b) => a.dep.localeCompare(b.dep));
    for (let i = 0; i < group.length; i++) {
      for (let j = i; j < group.length; j++) {
        const follows = j === i || (group[j - 1].to === group[j].from && group[j].dep >= group[j - 1].arr);
        if (!follows) break;
        if (group[i].from === group[j].to) continue;
        out.push({
          day, flight: group[i].flight, from: group[i].from, to: group[j].to, dep: group[i].dep, arr: group[j].arr,
          via: group.slice(i + 1, j + 1).map((leg) => leg.from), aircraft: group[i].aircraft,
        });
      }
    }
  }
  return out;
}

export type WantedFlight = FlightFields & { pair: string; date: string };

/**
 * The dated flights a timetable says, per city pair ("FIH-FBM"), between two dates.
 * Two trips on one pair and date with the same number or the same time cannot both be stored
 * (Flight's unique keys): the first is kept and the other reported.
 */
export function wantedFlights(timetable: Timetable, from: string, to: string) {
  const flights: WantedFlight[] = [];
  const duplicates: WantedFlight[] = [];
  const taken = new Set<string>();
  for (const trip of trips(timetable.legs)) {
    for (const date of datesOnWeekdays(from, to, [trip.day])) {
      const f: WantedFlight = {
        pair: `${trip.from}-${trip.to}`, date, flightNumber: trip.flight, departureTime: trip.dep, arrivalTime: trip.arr,
        arrivalDayOffset: arrivalDayOffset(trip.dep, trip.arr), via: trip.via, aircraft: trip.aircraft ?? null,
      };
      const keys = [`${f.pair}|${date}|t${f.departureTime}`, f.flightNumber && `${f.pair}|${date}|n${f.flightNumber}`].filter(Boolean) as string[];
      if (keys.some((k) => taken.has(k))) {
        duplicates.push(f);
        continue;
      }
      keys.forEach((k) => taken.add(k));
      flights.push(f);
    }
  }
  flights.sort((a, b) => a.pair.localeCompare(b.pair) || a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime));
  return { flights, duplicates };
}

export type TimetablePlan = {
  add: WantedFlight[];
  update: { id: string; date: string; before: FlightFields; after: FlightFields }[];
  /** Same flight, same fields: only its verification date moves. */
  confirm: { id: string; date: string }[];
  /** Scheduled, in the window, and not in the newer document. */
  remove: StoredFlight[];
  /** Cancelled by an operator: left alone, a cancellation is a decision. */
  keptCancelled: StoredFlight[];
};

/**
 * One airline on one city pair: what the newer timetable changes in the stored flights of the window.
 * A stored flight is the wanted one when it has the same number on that date (or, unnumbered,
 * the same departure time). Every date of the window is compared, so a flight the newer document
 * no longer lists is removed: removals are part of the plan, and the batch can be undone.
 */
export function planTimetable(stored: StoredFlight[], wanted: WantedFlight[]): TimetablePlan {
  const plan: TimetablePlan = { add: [], update: [], confirm: [], remove: [], keptCancelled: [] };
  const matched = new Set<string>();
  for (const w of wanted) {
    const sameDay = stored.filter((s) => s.date === w.date && !matched.has(s.id));
    const match = w.flightNumber
      ? sameDay.find((s) => s.flightNumber === w.flightNumber)
      : sameDay.find((s) => s.flightNumber === null && s.departureTime === w.departureTime);
    if (!match) {
      plan.add.push(w);
      continue;
    }
    matched.add(match.id);
    if (match.status === "CANCELLED") plan.keptCancelled.push(match);
    else if (sameFields(match, w)) plan.confirm.push({ id: match.id, date: w.date });
    else {
      const { pair: _pair, date: _date, ...after } = w;
      plan.update.push({ id: match.id, date: w.date, before: pickStored(match), after });
    }
  }
  for (const s of stored) {
    if (matched.has(s.id)) continue;
    if (s.status === "CANCELLED") plan.keptCancelled.push(s);
    else plan.remove.push(s);
  }

  // Writes run deletes, then updates, then additions. An update that takes a number or time another
  // flight still holds at that moment (two flights swapping times) is done as a removal and an addition.
  const removed = new Set(plan.remove.map((s) => s.id));
  const holds = (id: string, date: string, f: FlightFields) =>
    stored.some(
      (s) => s.id !== id && s.date === date && !removed.has(s.id) &&
        (s.departureTime === f.departureTime || (f.flightNumber !== null && s.flightNumber === f.flightNumber)),
    );
  const clashing = plan.update.filter((u) => holds(u.id, u.date, u.after));
  for (const u of clashing) {
    const s = stored.find((x) => x.id === u.id)!;
    plan.remove.push(s);
    plan.add.push({ ...u.after, date: u.date, pair: wanted.find((w) => w.date === u.date)!.pair });
  }
  plan.update = plan.update.filter((u) => !clashing.includes(u));
  return plan;
}

/** Additions that would collide with a flight kept as it is (a cancelled one): reported, never written. */
export function blockedAdditions(plan: TimetablePlan) {
  return plan.add.filter((a) =>
    plan.keptCancelled.some((c) => c.date === a.date && (c.departureTime === a.departureTime || (a.flightNumber !== null && c.flightNumber === a.flightNumber))),
  );
}

const pickStored = (s: StoredFlight): FlightFields => ({
  flightNumber: s.flightNumber, departureTime: s.departureTime, arrivalTime: s.arrivalTime,
  arrivalDayOffset: s.arrivalDayOffset, via: [...s.via], aircraft: s.aircraft,
});
