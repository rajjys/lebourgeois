import "server-only";
import prisma from "@/lib/prisma";
import { PUBLIC_PATTERN_FILTER } from "@/lib/flightPatterns/visibility";
import { computeNextDepartureDate } from "@/lib/flightPatterns/nextDeparture";

/**
 * Data for the home page, read on the server so it is in the HTML (docs/SEO-AEO-GEO.md §4.1).
 * Reads FlightPattern for now; RW-1 swaps the source to dated flights and keeps these shapes.
 */

type Place = { code: string; city: string; slug: string };

export type UpcomingDeparture = {
  id: string;
  /** Local calendar date at the origin, "YYYY-MM-DD". */
  date: string;
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
  origin: Place;
  destination: Place;
  airline: { code: string; name: string };
  price: number | null;
  /** When the owner last confirmed or edited the row; stands in as the price observation date. */
  checkedAt: string;
};

export type TrackedRoute = {
  origin: Place;
  destination: Place;
  airlineCount: number;
  /** Departures in the next 7 days, all airlines. Counted from dates, so overlapping periods don't double count. */
  flightsNext7Days: number;
  minPrice: number | null;
  minPriceCheckedAt: string | null;
};

export type AirportAlert = {
  code: string;
  city: string;
  status: "RESTRICTED" | "CLOSED";
  note: string | null;
  since: string | null;
  sourceUrl: string | null;
};

const WEEKDAY_BY_UTC_DAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const DAY_MS = 86_400_000;

const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

function countDepartures(p: { daysOfWeek: string[]; startDate: Date; endDate: Date }, from: Date, days: number) {
  const first = utcDay(p.startDate);
  const last = utcDay(p.endDate);
  let count = 0;
  for (let i = 0; i < days; i++) {
    const day = utcDay(from) + i * DAY_MS;
    if (day < first || day > last) continue;
    if (p.daysOfWeek.includes(WEEKDAY_BY_UTC_DAY[new Date(day).getUTCDay()])) count++;
  }
  return count;
}

const place = (a: { code: string; city: string; slug: string }): Place => ({ code: a.code, city: a.city, slug: a.slug });

export async function getHomeData(now = new Date()) {
  const [patterns, alerts] = await Promise.all([
    prisma.flightPattern.findMany({
      where: { ...PUBLIC_PATTERN_FILTER, endDate: { gte: now } },
      include: { airline: true, origin: true, destination: true },
    }),
    prisma.airport.findMany({
      where: { status: { not: "OPEN" } },
      orderBy: { city: "asc" },
    }),
  ]);

  const departures: UpcomingDeparture[] = [];
  const routes = new Map<string, TrackedRoute & { airlines: Set<string> }>();

  for (const p of patterns) {
    const next = computeNextDepartureDate({
      daysOfWeek: p.daysOfWeek,
      departureTime: p.departureTime,
      startDate: p.startDate,
      endDate: p.endDate,
      originTimezone: p.origin.timezone,
      referenceDate: now,
    });
    if (!next) continue;

    departures.push({
      id: p.id,
      date: next.slice(0, 10),
      departureTime: p.departureTime,
      arrivalTime: p.arrivalTime,
      flightNumber: p.flightNumber,
      origin: place(p.origin),
      destination: place(p.destination),
      airline: { code: p.airline.code, name: p.airline.name },
      price: p.price,
      checkedAt: (p.verifiedAt ?? p.updatedAt).toISOString(),
    });

    const key = `${p.origin.code}-${p.destination.code}`;
    const route = routes.get(key) ?? {
      origin: place(p.origin),
      destination: place(p.destination),
      airlineCount: 0,
      flightsNext7Days: 0,
      minPrice: null,
      minPriceCheckedAt: null,
      airlines: new Set<string>(),
    };
    route.airlines.add(p.airline.code);
    route.flightsNext7Days += countDepartures(p, now, 7);
    if (p.price != null && (route.minPrice == null || p.price < route.minPrice)) {
      route.minPrice = p.price;
      route.minPriceCheckedAt = (p.verifiedAt ?? p.updatedAt).toISOString();
    }
    routes.set(key, route);
  }

  departures.sort((a, b) => a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime));

  return {
    departures: departures.slice(0, 8),
    // Busiest first: the default priority until routes get a manual tier (ROUTE-MODEL.md §10).
    routes: [...routes.values()]
      .map(({ airlines, ...r }) => ({ ...r, airlineCount: airlines.size }))
      .sort((a, b) => b.flightsNext7Days - a.flightsNext7Days || a.origin.city.localeCompare(b.origin.city)),
    airportAlerts: alerts.map(
      (a): AirportAlert => ({
        code: a.code,
        city: a.city,
        status: a.status as AirportAlert["status"],
        note: a.statusNote,
        since: a.statusSince?.toISOString() ?? null,
        sourceUrl: a.statusSourceUrl,
      }),
    ),
  };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
