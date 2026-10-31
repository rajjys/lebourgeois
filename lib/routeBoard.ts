import "server-only";
import prisma from "@/lib/prisma";
import { byAttention, dayOf, freshnessOf, isUpcoming, localNow, routeFreshness, type Freshness } from "@/lib/routeStatus";

export type BoardAirline = { code: string; name: string; status: "ACTIVE" | "SUSPENDED" | "ENDED"; isPublished: boolean };

export type BoardRoute = {
  id: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tier: number;
  origin: { code: string; city: string; status: string };
  destination: { code: string; city: string; status: string };
  reverseSlug: string | null;
  airlines: BoardAirline[];
  next: { day: string; time: string; flightNumber: string | null; airline: string } | null;
  flightsNext7Days: number;
  knownUntil: string | null;
  freshness: Freshness;
  prices: { approved: number; pending: number };
  requests: number;
};

/**
 * Everything the network board shows, computed from the flights (docs/ROUTE-MODEL.md §6.1).
 * A few hundred rows at the target scope, so it is computed on each request.
 */
export async function loadRouteBoard(now: Date = new Date()): Promise<BoardRoute[]> {
  const yesterday = new Date(`${dayOf(new Date(now.getTime() - 86_400_000))}T00:00:00Z`);
  const [routes, flights, lastDays, fareCounts] = await Promise.all([
    prisma.route.findMany({
      include: {
        origin: { select: { id: true, code: true, city: true, status: true, timezone: true } },
        destination: { select: { id: true, code: true, city: true, status: true } },
        airlines: { include: { airline: { select: { code: true, name: true } } } },
        _count: { select: { requests: true } },
      },
    }),
    prisma.flight.findMany({
      where: { date: { gte: yesterday }, status: "SCHEDULED", reviewStatus: "APPROVED" },
      select: { routeAirlineId: true, date: true, departureTime: true, flightNumber: true },
      orderBy: [{ date: "asc" }, { departureTime: "asc" }],
    }),
    prisma.flight.groupBy({
      by: ["routeAirlineId"],
      where: { status: "SCHEDULED", reviewStatus: "APPROVED" },
      _max: { date: true },
    }),
    prisma.fareObservation.groupBy({ by: ["routeAirlineId", "reviewStatus"], _count: true }),
  ]);

  const flightsBy = new Map<string, typeof flights>();
  for (const f of flights) flightsBy.set(f.routeAirlineId, [...(flightsBy.get(f.routeAirlineId) ?? []), f]);
  const lastDayBy = new Map(lastDays.map((l) => [l.routeAirlineId, l._max.date]));
  const faresBy = new Map<string, { approved: number; pending: number }>();
  for (const c of fareCounts) {
    const counts = faresBy.get(c.routeAirlineId) ?? { approved: 0, pending: 0 };
    if (c.reviewStatus === "APPROVED") counts.approved += c._count;
    if (c.reviewStatus === "PENDING") counts.pending += c._count;
    faresBy.set(c.routeAirlineId, counts);
  }
  const slugByPair = new Map(routes.map((r) => [`${r.originId}-${r.destinationId}`, r.slug]));

  const rows = routes.map((route): BoardRoute => {
    const local = localNow(route.origin.timezone, now);
    const weekEnd = dayOf(new Date(new Date(`${local.day}T00:00:00Z`).getTime() + 6 * 86_400_000));
    let next: BoardRoute["next"] = null;
    let flightsNext7Days = 0;
    let knownUntil: string | null = null;
    let approved = 0;
    let pending = 0;

    for (const ra of route.airlines) {
      for (const f of flightsBy.get(ra.id) ?? []) {
        if (!isUpcoming(f, local)) continue;
        const day = dayOf(f.date);
        if (day <= weekEnd) flightsNext7Days++;
        if (!next || day < next.day || (day === next.day && f.departureTime < next.time)) {
          next = { day, time: f.departureTime, flightNumber: f.flightNumber, airline: ra.airline.code };
        }
      }
      const last = lastDayBy.get(ra.id);
      if (last && (!knownUntil || dayOf(last) > knownUntil)) knownUntil = dayOf(last);
      approved += faresBy.get(ra.id)?.approved ?? 0;
      pending += faresBy.get(ra.id)?.pending ?? 0;
    }

    return {
      id: route.id,
      slug: route.slug,
      status: route.status,
      tier: route.tier,
      origin: { code: route.origin.code, city: route.origin.city, status: route.origin.status },
      destination: { code: route.destination.code, city: route.destination.city, status: route.destination.status },
      reverseSlug: slugByPair.get(`${route.destinationId}-${route.originId}`) ?? null,
      airlines: route.airlines
        .map((ra) => ({ code: ra.airline.code, name: ra.airline.name, status: ra.status, isPublished: ra.isPublished }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      next,
      flightsNext7Days,
      knownUntil,
      freshness: routeFreshness(route.airlines, now),
      prices: { approved, pending },
      requests: route._count.requests,
    };
  });

  return rows.sort(byAttention);
}

/** One route with everything under it, for its back-office page. Null when the slug is unknown. */
export async function loadRouteDetail(slug: string, now: Date = new Date()) {
  const route = await prisma.route.findUnique({
    where: { slug },
    include: {
      origin: true,
      destination: true,
      airlines: {
        include: {
          airline: { select: { code: true, name: true, status: true } },
          fares: { orderBy: { observedAt: "desc" } },
        },
        orderBy: { airline: { code: "asc" } },
      },
      _count: { select: { requests: true } },
    },
  });
  if (!route) return null;

  const local = localNow(route.origin.timezone, now);
  const from = new Date(`${local.day}T00:00:00Z`);
  const until = new Date(from.getTime() + 27 * 86_400_000); // the next 4 weeks
  const routeAirlineIds = route.airlines.map((ra) => ra.id);
  const [flights, lastDays, reverse] = await Promise.all([
    prisma.flight.findMany({
      where: { routeAirlineId: { in: routeAirlineIds }, date: { gte: from, lte: until } },
      orderBy: [{ date: "asc" }, { departureTime: "asc" }],
    }),
    prisma.flight.groupBy({
      by: ["routeAirlineId"],
      where: { routeAirlineId: { in: routeAirlineIds }, status: "SCHEDULED", reviewStatus: "APPROVED" },
      _max: { date: true },
    }),
    prisma.route.findUnique({
      where: { originId_destinationId: { originId: route.destinationId, destinationId: route.originId } },
      select: { slug: true },
    }),
  ]);
  const upcoming = flights.filter((f) => isUpcoming(f, local));
  const lastDayBy = new Map(lastDays.map((l) => [l.routeAirlineId, l._max.date]));
  const stopCodes = [...new Set(upcoming.flatMap((f) => f.via))];
  const stops = stopCodes.length
    ? Object.fromEntries((await prisma.airport.findMany({ where: { code: { in: stopCodes } }, select: { code: true, city: true } })).map((a) => [a.code, a.city]))
    : {};

  return {
    route,
    reverseSlug: reverse?.slug ?? null,
    stops: stops as Record<string, string>,
    freshness: routeFreshness(route.airlines, now),
    airlines: route.airlines.map((ra) => {
      const own = upcoming.filter((f) => f.routeAirlineId === ra.id && f.status === "SCHEDULED" && f.reviewStatus === "APPROVED");
      const last = lastDayBy.get(ra.id);
      return {
        ...ra,
        next: own[0] ?? null,
        flightsNext4Weeks: own.length,
        knownUntil: last ? dayOf(last) : null,
        freshness: freshnessOf(ra.verifiedAt, now),
      };
    }),
    // Next 14 days, cancelled and pending ones included so nothing is hidden from the operator.
    departures: upcoming.filter((f) => dayOf(f.date) <= dayOf(new Date(from.getTime() + 13 * 86_400_000))),
  };
}

export type RouteDetail = NonNullable<Awaited<ReturnType<typeof loadRouteDetail>>>;
