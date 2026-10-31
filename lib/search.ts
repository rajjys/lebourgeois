import "server-only";
import prisma from "@/lib/prisma";
import type { FareObservation, Prisma } from "@/lib/generated/prisma/client";
import { durationMinutes } from "@/lib/flights";
import { dayOf, isUpcoming, localNow } from "@/lib/routeStatus";
import { addDays } from "@/lib/schedule";
import { groupServices, serviceKey, type Price, type SearchFlight } from "@/lib/searchResults";
import { WEEKDAYS } from "@/lib/format";
import { weekdayOf } from "@/lib/flights";

/** Days of flights a search looks at: four weeks from the chosen date, or from today. */
export const SEARCH_DAYS = 28;

/**
 * What the public sees (docs/ROUTE-MODEL.md §5.6): validated, scheduled flights of an airline
 * that is published, on a route where it is published. The route's own status decides whether
 * it gets a page (RW-5), not whether its flights can be found.
 */
export const PUBLIC_FLIGHT: Prisma.FlightWhereInput = {
  status: "SCHEDULED",
  reviewStatus: "APPROVED",
  routeAirline: { isPublished: true, airline: { isPublished: true } },
};

const toPrice = (f: FareObservation): Price => ({
  amount: Number(f.amount),
  currency: f.currency,
  observedAt: f.observedAt.toISOString(),
  kind: f.kind,
  tripType: f.tripType,
  fareName: f.fareName ?? f.cabin,
  sourceUrl: f.sourceUrl,
});

/** Latest validated price per airline on a route. */
export async function latestPrices(routeAirlineIds: string[]) {
  const fares = await prisma.fareObservation.findMany({
    where: { routeAirlineId: { in: routeAirlineIds }, reviewStatus: "APPROVED" },
    orderBy: { observedAt: "desc" },
    distinct: ["routeAirlineId"],
  });
  return new Map(fares.map((f) => [f.routeAirlineId, toPrice(f)]));
}

async function cities(codes: string[]) {
  if (codes.length === 0) return new Map<string, string>();
  const rows = await prisma.airport.findMany({ where: { code: { in: codes } }, select: { code: true, city: true } });
  return new Map(rows.map((a) => [a.code, a.city]));
}

const toSearchFlight = (f: { id: string; routeAirlineId: string; date: Date; flightNumber: string | null; departureTime: string; arrivalTime: string; arrivalDayOffset: number; via: string[] }): SearchFlight => ({
  id: f.id,
  routeAirlineId: f.routeAirlineId,
  date: dayOf(f.date),
  flightNumber: f.flightNumber,
  departureTime: f.departureTime,
  arrivalTime: f.arrivalTime,
  arrivalDayOffset: f.arrivalDayOffset,
  via: f.via,
});

/** Search one direction, with or without a date. Null when an airport code is unknown. */
export async function searchRoute(fromCode: string, toCode: string, date: string | null, now: Date = new Date()) {
  const [origin, destination] = await Promise.all([
    prisma.airport.findUnique({ where: { code: fromCode } }),
    prisma.airport.findUnique({ where: { code: toCode } }),
  ]);
  if (!origin || !destination) return null;
  const local = localNow(origin.timezone, now);
  const start = date && date > local.day ? date : local.day;

  const rows = await prisma.flight.findMany({
    where: {
      ...PUBLIC_FLIGHT,
      date: { gte: new Date(`${start}T00:00:00Z`), lte: new Date(`${addDays(start, SEARCH_DAYS - 1)}T00:00:00Z`) },
      routeAirline: { ...(PUBLIC_FLIGHT.routeAirline as object), route: { originId: origin.id, destinationId: destination.id } },
    },
    include: { routeAirline: { include: { airline: { select: { code: true, name: true } } } } },
    orderBy: [{ date: "asc" }, { departureTime: "asc" }],
  });
  const upcoming = rows.filter((f) => isUpcoming(f, local));
  const airlines = new Map(rows.map((f) => [f.routeAirlineId, f.routeAirline.airline]));
  const [prices, stops] = await Promise.all([latestPrices([...airlines.keys()]), cities([...new Set(rows.flatMap((f) => f.via))])]);

  const services = groupServices(upcoming.map(toSearchFlight), {
    date,
    airline: (id) => airlines.get(id)!,
    price: (id) => prices.get(id) ?? null,
    city: (code) => stops.get(code) ?? code,
    duration: (f) => durationMinutes(f, origin.timezone, destination.timezone),
  });

  const place = (a: typeof origin) => ({ code: a.code, city: a.city, name: a.name, status: a.status });
  return { origin: place(origin), destination: place(destination), date, today: local.day, services };
}

export type SearchResult = NonNullable<Awaited<ReturnType<typeof searchRoute>>>;

/**
 * One departure, for its own page: the details that don't belong in a list (number, aircraft,
 * stops, other dates, sources). Null when the flight is unknown or not public.
 */
export async function loadFlight(id: string, now: Date = new Date()) {
  const flight = await prisma.flight.findFirst({
    where: { id, ...PUBLIC_FLIGHT },
    include: {
      routeAirline: { include: { airline: true, route: { include: { origin: true, destination: true } } } },
    },
  });
  if (!flight) return null;
  const { route, airline } = flight.routeAirline;
  const local = localNow(route.origin.timezone, now);
  const day = dayOf(flight.date);

  // The same service on other dates: same airline, number, times and stops, from today on.
  const others = await prisma.flight.findMany({
    where: {
      ...PUBLIC_FLIGHT,
      routeAirlineId: flight.routeAirlineId,
      date: { gte: new Date(`${local.day}T00:00:00Z`), lte: new Date(`${addDays(local.day, SEARCH_DAYS - 1)}T00:00:00Z`) },
    },
    orderBy: [{ date: "asc" }, { departureTime: "asc" }],
  });
  const key = serviceKey(toSearchFlight(flight));
  const siblings = others.filter((f) => serviceKey(toSearchFlight(f)) === key && isUpcoming(f, local));
  const [prices, stops] = await Promise.all([latestPrices([flight.routeAirlineId]), cities(flight.via)]);
  const seen = new Set(siblings.map((f) => weekdayOf(dayOf(f.date))));

  return {
    id: flight.id,
    date: day,
    departed: !isUpcoming(flight, local),
    flightNumber: flight.flightNumber,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    arrivalDayOffset: flight.arrivalDayOffset,
    durationMinutes: durationMinutes(flight, route.origin.timezone, route.destination.timezone),
    via: flight.via.map((code) => ({ code, city: stops.get(code) ?? code })),
    aircraft: flight.aircraft,
    verifiedAt: (flight.verifiedAt ?? flight.routeAirline.verifiedAt)?.toISOString() ?? null,
    sourceUrl: flight.sourceUrl ?? flight.routeAirline.verifiedSourceUrl,
    airline: { code: airline.code, name: airline.name, website: airline.website },
    bookingUrl: flight.routeAirline.bookingUrl ?? airline.bookingUrl ?? airline.website,
    note: flight.routeAirline.note,
    origin: airportFacts(route.origin),
    destination: airportFacts(route.destination),
    days: WEEKDAYS.filter((d) => seen.has(d)),
    otherDates: siblings.filter((f) => f.id !== flight.id).slice(0, 8).map((f) => ({ id: f.id, date: dayOf(f.date) })),
    price: prices.get(flight.routeAirlineId) ?? null,
  };
}

/** What the flight page shows of an airport, including its closure notice when it has one. */
const airportFacts = (a: { code: string; city: string; name: string; status: "OPEN" | "RESTRICTED" | "CLOSED"; statusNote: string | null; statusSince: Date | null; statusSourceUrl: string | null }) => ({
  code: a.code,
  city: a.city,
  name: a.name,
  status: a.status,
  statusNote: a.statusNote,
  statusSince: a.statusSince?.toISOString() ?? null,
  statusSourceUrl: a.statusSourceUrl,
});

export type FlightPage = NonNullable<Awaited<ReturnType<typeof loadFlight>>>;
