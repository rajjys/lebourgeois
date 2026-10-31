/**
 * Search results from dated flights (docs/ROUTE-MODEL.md §7). Pure functions, shared by the API,
 * the pages and the tests.
 *
 * A result is a *service*: one airline's flight with the same number, times and stops, seen on
 * one or more dates. The card shows it once, with the weekdays it flies and its next departure,
 * instead of one card per date.
 */
import { WEEKDAYS, type WeekdayCode } from "./format";
import { weekdayOf } from "./flights";

export type Price = {
  amount: number;
  currency: string;
  observedAt: string;
  kind: "FROM_PRICE" | "QUOTE";
  tripType: "ONE_WAY" | "ROUND_TRIP";
  fareName: string | null;
  sourceUrl: string | null;
};

export type SearchFlight = {
  id: string;
  routeAirlineId: string;
  date: string;
  flightNumber: string | null;
  departureTime: string;
  arrivalTime: string;
  arrivalDayOffset: number;
  via: string[];
};

export type Service = {
  key: string;
  routeAirlineId: string;
  airline: { code: string; name: string };
  flightNumber: string | null;
  departureTime: string;
  arrivalTime: string;
  arrivalDayOffset: number;
  via: { code: string; city: string }[];
  durationMinutes: number;
  /** Weekdays this service flies in the dates searched. */
  days: WeekdayCode[];
  /** The departure the card links to: on the chosen date, or the next one. */
  next: { flightId: string; date: string };
  /** Latest validated price for this airline on this route, if any. */
  price: Price | null;
};

export const serviceKey = (f: SearchFlight) =>
  [f.routeAirlineId, f.flightNumber ?? "", f.departureTime, f.arrivalTime, f.arrivalDayOffset, f.via.join(",")].join("|");

/**
 * Groups flights into services. With a date, only services flying that date are kept and
 * `next` is that day's flight; without one, `next` is the earliest. Flights must be upcoming
 * and sorted by date then time.
 */
export function groupServices(
  flights: SearchFlight[],
  extra: {
    date: string | null;
    airline: (routeAirlineId: string) => { code: string; name: string };
    price: (routeAirlineId: string) => Price | null;
    city: (code: string) => string;
    duration: (f: SearchFlight) => number;
  },
): Service[] {
  const groups = new Map<string, SearchFlight[]>();
  for (const f of flights) groups.set(serviceKey(f), [...(groups.get(serviceKey(f)) ?? []), f]);

  const services: Service[] = [];
  for (const [key, group] of groups) {
    const shown = extra.date ? group.find((f) => f.date === extra.date) : group[0];
    if (!shown) continue;
    const seen = new Set(group.map((f) => weekdayOf(f.date)));
    services.push({
      key,
      routeAirlineId: shown.routeAirlineId,
      airline: extra.airline(shown.routeAirlineId),
      flightNumber: shown.flightNumber,
      departureTime: shown.departureTime,
      arrivalTime: shown.arrivalTime,
      arrivalDayOffset: shown.arrivalDayOffset,
      via: shown.via.map((code) => ({ code, city: extra.city(code) })),
      durationMinutes: extra.duration(shown),
      days: WEEKDAYS.filter((d) => seen.has(d)),
      next: { flightId: shown.id, date: shown.date },
      price: extra.price(shown.routeAirlineId),
    });
  }
  return services;
}

export const SORTS = ["best", "cheapest", "fastest", "soonest"] as const;
export type SortKey = (typeof SORTS)[number];

const when = (s: Service) => `${s.next.date} ${s.departureTime}`;
const bySoonest = (a: Service, b: Service) => when(a).localeCompare(when(b)) || a.airline.code.localeCompare(b.airline.code);
const priceOf = (s: Service) => s.price?.amount ?? Number.POSITIVE_INFINITY;

/** Position of each service when sorted by one criterion (ties share a position). */
function ranks(services: Service[], value: (s: Service) => number | string) {
  const sorted = [...new Set(services.map(value))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return new Map(services.map((s) => [s.key, sorted.indexOf(value(s))]));
}

/**
 * - soonest: the next departure first ("Plus proche").
 * - cheapest: lowest validated price first; services without a price last.
 * - fastest: shortest flight first.
 * - best ("Recommandé"): direct flights first, then the best balance of departure, price and
 *   duration (sum of the three positions); ties go to the soonest.
 */
export function sortServices(services: Service[], sort: SortKey): Service[] {
  const list = [...services];
  if (sort === "soonest") return list.sort(bySoonest);
  if (sort === "cheapest") return list.sort((a, b) => priceOf(a) - priceOf(b) || bySoonest(a, b));
  if (sort === "fastest") return list.sort((a, b) => a.durationMinutes - b.durationMinutes || bySoonest(a, b));
  const r = [ranks(list, when), ranks(list, priceOf), ranks(list, (s) => s.durationMinutes)];
  const score = (s: Service) => r.reduce((sum, m) => sum + m.get(s.key)!, 0);
  return list.sort((a, b) => a.via.length - b.via.length || score(a) - score(b) || bySoonest(a, b));
}
