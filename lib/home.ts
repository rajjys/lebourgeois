import "server-only";
import prisma from "@/lib/prisma";
import { PUBLIC_FLIGHT, latestPrices } from "@/lib/search";
import { dayOf, isUpcoming, localNow } from "@/lib/routeStatus";
import { addDays } from "@/lib/schedule";

/**
 * Data for the home page, read on the server so it is in the HTML (docs/SEO-AEO-GEO.md §4.1).
 * Read from dated flights, with the same visibility rule as the search (lib/search.ts).
 */

type Place = { code: string; city: string; slug: string };

export type UpcomingDeparture = {
  id: string;
  /** Local calendar date at the origin, "YYYY-MM-DD". */
  date: string;
  departureTime: string;
  arrivalTime: string;
  flightNumber: string | null;
  origin: Place;
  destination: Place;
  airline: { code: string; name: string };
  /** Latest validated price for this airline on this route, and when it was seen. */
  price: number | null;
  priceObservedAt: string | null;
  /** When the schedule was last checked. */
  checkedAt: string | null;
};

export type TrackedRoute = {
  origin: Place;
  destination: Place;
  airlineCount: number;
  /** Departures in the next 7 days, all airlines. Counted from dates, so overlapping periods don't double count. */
  flightsNext7Days: number;
  minPrice: number | null;
  minPriceObservedAt: string | null;
};

export type AirportAlert = {
  code: string;
  city: string;
  status: "RESTRICTED" | "CLOSED";
  note: string | null;
  since: string | null;
  sourceUrl: string | null;
};

const DAY_MS = 86_400_000;
const place = (a: { code: string; city: string; slug: string }): Place => ({ code: a.code, city: a.city, slug: a.slug });

export async function getHomeData(now = new Date()) {
  // From yesterday (UTC) so that early-morning departures in UTC+2 are not missed; each flight
  // is then checked against its own airport's clock.
  const from = new Date(`${dayOf(new Date(now.getTime() - DAY_MS))}T00:00:00Z`);
  const until = new Date(`${addDays(dayOf(now), 7)}T00:00:00Z`);
  const [flights, alerts] = await Promise.all([
    prisma.flight.findMany({
      where: { ...PUBLIC_FLIGHT, date: { gte: from, lte: until } },
      include: { routeAirline: { include: { airline: true, route: { include: { origin: true, destination: true } } } } },
      orderBy: [{ date: "asc" }, { departureTime: "asc" }],
    }),
    prisma.airport.findMany({
      where: { status: { not: "OPEN" } },
      orderBy: { city: "asc" },
    }),
  ]);

  const upcoming = flights.filter((f) => isUpcoming(f, localNow(f.routeAirline.route.origin.timezone, now)));
  const prices = await latestPrices([...new Set(upcoming.map((f) => f.routeAirlineId))]);

  // The next departure of each airline on each route, so one daily flight does not fill the list.
  const departures: UpcomingDeparture[] = [];
  const seen = new Set<string>();
  for (const f of upcoming) {
    if (seen.has(f.routeAirlineId)) continue;
    seen.add(f.routeAirlineId);
    const { route, airline } = f.routeAirline;
    const price = prices.get(f.routeAirlineId);
    departures.push({
      id: f.id,
      date: dayOf(f.date),
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      flightNumber: f.flightNumber,
      origin: place(route.origin),
      destination: place(route.destination),
      airline: { code: airline.code, name: airline.name },
      price: price?.amount ?? null,
      priceObservedAt: price?.observedAt ?? null,
      checkedAt: (f.verifiedAt ?? f.routeAirline.verifiedAt)?.toISOString() ?? null,
    });
  }

  const routes = new Map<string, TrackedRoute & { airlines: Set<string> }>();
  for (const f of upcoming) {
    const { route } = f.routeAirline;
    const key = route.slug;
    const entry = routes.get(key) ?? {
      origin: place(route.origin),
      destination: place(route.destination),
      airlineCount: 0,
      flightsNext7Days: 0,
      minPrice: null,
      minPriceObservedAt: null,
      airlines: new Set<string>(),
    };
    entry.airlines.add(f.routeAirlineId);
    if (dayOf(f.date) <= addDays(localNow(route.origin.timezone, now).day, 6)) entry.flightsNext7Days++;
    const price = prices.get(f.routeAirlineId);
    if (price && (entry.minPrice == null || price.amount < entry.minPrice)) {
      entry.minPrice = price.amount;
      entry.minPriceObservedAt = price.observedAt;
    }
    routes.set(key, entry);
  }

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
