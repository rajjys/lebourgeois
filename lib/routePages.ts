import "server-only";
import { cache } from "react";
import prisma from "@/lib/prisma";
import { PUBLIC_FLIGHT, SEARCH_DAYS, latestPrices, loadFlight, searchRoute } from "@/lib/search";
import { dayOf, isUpcoming, localNow } from "@/lib/routeStatus";
import { addDays } from "@/lib/schedule";
import { splitRouteSlug } from "@/lib/routeSlug";
import { shortAirlineName, WEEKDAYS } from "@/lib/format";
import { weekdayOf } from "@/lib/flights";

/**
 * Public route pages (RW-5, docs/ROUTE-MODEL.md §7):
 * - /vols/a-b renders for any two known airports: it is also the search result.
 * - It is indexable (robots, sitemap) when the route is PUBLISHED and has something to show: an airline
 *   published on it (even suspended or ended: the page stays as a record) or an airport notice.
 * - It is linked from our own pages (hub, home, return trip) when it has public data or is
 *   published; a pair with nothing to show is never linked, so search engines never see it.
 */

/** §7 "first published": the operator published the route, and the page has content. */
const hasContent = (r: { status: string; publishedAirlines: number; origin: { status: string }; destination: { status: string } }) =>
  r.status === "PUBLISHED" && (r.publishedAirlines > 0 || r.origin.status !== "OPEN" || r.destination.status !== "OPEN");

const airportsBySlug = cache(async () => {
  const airports = await prisma.airport.findMany();
  return new Map(airports.map((a) => [a.slug, a]));
});

/** The two airports and, when it exists, the route behind a /vols/{slug} address. */
export const resolveRoute = cache(async (slug: string) => {
  const airports = await airportsBySlug();
  const pair = splitRouteSlug(slug, new Set(airports.keys()));
  if (!pair) return null;
  const origin = airports.get(pair[0])!;
  const destination = airports.get(pair[1])!;
  const route = await prisma.route.findUnique({ where: { originId_destinationId: { originId: origin.id, destinationId: destination.id } } });
  return { origin, destination, route, slug: `${origin.slug}-${destination.slug}` };
});

/** /vols/{slug} for two airport codes (redirects and the search box). */
export async function routeSlugForCodes(fromCode: string, toCode: string) {
  const airports = await prisma.airport.findMany({ where: { code: { in: [fromCode, toCode] } }, select: { code: true, slug: true } });
  const from = airports.find((a) => a.code === fromCode);
  const to = airports.find((a) => a.code === toCode);
  return from && to && from.code !== to.code ? `${from.slug}-${to.slug}` : null;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** An airport as the public pages show it, with its closure or restriction notice. */
const place = (a: {
  code: string;
  slug: string;
  city: string;
  name: string;
  timezone: string;
  status: "OPEN" | "RESTRICTED" | "CLOSED";
  statusNote: string | null;
  statusSince: Date | null;
  statusSourceUrl: string | null;
}) => ({
  code: a.code,
  slug: a.slug,
  city: a.city,
  name: a.name,
  timezone: a.timezone,
  status: a.status,
  statusNote: a.statusNote,
  statusSince: a.statusSince?.toISOString() ?? null,
  statusSourceUrl: a.statusSourceUrl,
});

/** Everything the route page shows, read on the server. Null when the address is not two known airports. */
export async function loadRoutePage(slug: string, date: string | null, now: Date = new Date()) {
  const resolved = await resolveRoute(slug);
  if (!resolved) return null;
  const { origin, destination, route } = resolved;

  // The four-week view feeds the per-airline summary; a date only narrows the result list.
  const [window, results] = await Promise.all([
    searchRoute(origin.code, destination.code, null, now),
    date ? searchRoute(origin.code, destination.code, date, now) : null,
  ]);
  const services = window!.services;

  const routeAirlines = route
    ? await prisma.routeAirline.findMany({
        where: { routeId: route.id, isPublished: true, airline: { isPublished: true } },
        include: { airline: true },
        orderBy: { airline: { name: "asc" } },
      })
    : [];
  const prices = await latestPrices(routeAirlines.map((ra) => ra.id));
  const today = localNow(origin.timezone, now).day;
  const weekEnd = addDays(today, 6);

  // Flights in the coming week, per airline, from the public departures.
  const weekFlights = route
    ? await prisma.flight.groupBy({
        by: ["routeAirlineId"],
        where: { ...PUBLIC_FLIGHT, routeAirline: { routeId: route.id, isPublished: true, airline: { isPublished: true } }, date: { gte: new Date(`${today}T00:00:00Z`), lte: new Date(`${weekEnd}T00:00:00Z`) } },
        _count: true,
      })
    : [];
  const weekCount = new Map(weekFlights.map((w) => [w.routeAirlineId, w._count]));

  const airlines = routeAirlines.map((ra) => {
    const own = services.filter((s) => s.routeAirlineId === ra.id);
    return {
      code: ra.airline.code,
      slug: ra.airline.slug,
      name: ra.airline.name,
      logo: ra.airline.logo,
      routeStatus: ra.status,
      airlineStatus: ra.airline.status,
      days: WEEKDAYS.filter((d) => own.some((s) => s.days.includes(d))),
      times: [...new Set(own.map((s) => s.departureTime))].sort(),
      flightsThisWeek: weekCount.get(ra.id) ?? 0,
      next: own.map((s) => s.next).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null,
      price: prices.get(ra.id) ?? null,
      verifiedAt: ra.verifiedAt?.toISOString() ?? null,
    };
  });

  const reverse = await prisma.route.findUnique({
    where: { originId_destinationId: { originId: destination.id, destinationId: origin.id } },
    select: { id: true, slug: true, status: true },
  });
  const [reverseServices, reverseWeek] = reverse
    ? await Promise.all([
        searchRoute(destination.code, origin.code, null, now).then((r) => r!.services),
        prisma.flight.count({
          where: { ...PUBLIC_FLIGHT, routeAirline: { routeId: reverse.id, isPublished: true, airline: { isPublished: true } }, date: { gte: new Date(`${today}T00:00:00Z`), lte: new Date(`${weekEnd}T00:00:00Z`) } },
        }),
      ])
    : [[], 0];

  // The three dates of SEO-AEO-GEO §4: when the page's data last changed, when it was last checked.
  const ids = routeAirlines.map((ra) => ra.id);
  const [lastFlight, lastFare, sourceRows] = await Promise.all([
    prisma.flight.aggregate({ where: { routeAirlineId: { in: ids } }, _max: { updatedAt: true } }),
    prisma.fareObservation.aggregate({ where: { routeAirlineId: { in: ids }, reviewStatus: "APPROVED" }, _max: { updatedAt: true } }),
    prisma.flight.findMany({ where: { ...PUBLIC_FLIGHT, routeAirlineId: { in: ids }, sourceUrl: { not: null } }, distinct: ["sourceUrl"], select: { sourceUrl: true } }),
  ]);
  const updatedAt = [route?.updatedAt, lastFlight._max.updatedAt, lastFare._max.updatedAt]
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const active = routeAirlines.filter((ra) => ra.status === "ACTIVE");
  const verifiedAt = active.length && active.every((ra) => ra.verifiedAt)
    ? active.map((ra) => ra.verifiedAt!).sort((a, b) => a.getTime() - b.getTime())[0]
    : null;
  const sources = [
    ...new Set(
      [...sourceRows.map((s) => s.sourceUrl!), ...routeAirlines.map((ra) => ra.verifiedSourceUrl).filter((u): u is string => !!u)],
    ),
  ].map((url) => ({ url, host: hostOf(url) ?? url }));

  // A date with no departure falls back to the four weeks, with a line saying so.
  const dated = !!results && results.services.length > 0;
  const hasPublicData = services.length > 0 || [...prices.values()].length > 0 || origin.status !== "OPEN" || destination.status !== "OPEN";

  return {
    slug: resolved.slug,
    origin: place(origin),
    destination: place(destination),
    route: route ? { status: route.status, note: route.note, tier: route.tier } : null,
    date,
    today,
    results: dated ? results!.services : services,
    dated,
    airlines,
    reverse: reverse
      ? {
          slug: reverse.slug,
          airlines: [...new Set(reverseServices.map((s) => shortAirlineName(s.airline.name)))].sort(),
          flightsThisWeek: reverseWeek,
          linked: reverse.status === "PUBLISHED" || reverseServices.length > 0,
        }
      : null,
    updatedAt: updatedAt?.toISOString() ?? null,
    verifiedAt: verifiedAt?.toISOString() ?? null,
    sources,
    indexable: !!route && hasContent({ status: route.status, publishedAirlines: routeAirlines.length, origin, destination }),
    hasPublicData,
  };
}

export type RoutePage = NonNullable<Awaited<ReturnType<typeof loadRoutePage>>>;

/**
 * One airline on one route. Null (404) unless the airline is published on it: an unpublished
 * record is work in progress. `date` picks the departure shown in full with the booking form.
 */
export async function loadAirlinePage(routeSlug: string, airlineSlug: string, date: string | null, time: string | null, now: Date = new Date()) {
  const resolved = await resolveRoute(routeSlug);
  if (!resolved?.route) return null;
  const { origin, destination, route } = resolved;
  const ra = await prisma.routeAirline.findFirst({
    where: { routeId: route.id, isPublished: true, airline: { slug: airlineSlug, isPublished: true } },
    include: { airline: true },
  });
  if (!ra) return null;

  const local = localNow(origin.timezone, now);
  const flights = await prisma.flight.findMany({
    where: {
      ...PUBLIC_FLIGHT,
      routeAirlineId: ra.id,
      date: { gte: new Date(`${local.day}T00:00:00Z`), lte: new Date(`${addDays(local.day, SEARCH_DAYS - 1)}T00:00:00Z`) },
    },
    orderBy: [{ date: "asc" }, { departureTime: "asc" }],
  });
  const upcoming = flights.filter((f) => isUpcoming(f, local));
  const search = (await searchRoute(origin.code, destination.code, null, now))!;
  const services = search.services
    .filter((s) => s.routeAirlineId === ra.id)
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime) || a.arrivalTime.localeCompare(b.arrivalTime));
  // Same count as the route page: every flight dated in the seven days from today, departed or not.
  const weekEnd = addDays(local.day, 6);
  const flightsThisWeek = flights.filter((f) => dayOf(f.date) <= weekEnd).length;
  // Several departures a day are common (CAA: three on Mondays), so ?heure= picks one of them.
  const onDate = date ? upcoming.filter((f) => dayOf(f.date) === date) : [];
  const chosen = onDate.find((f) => f.departureTime === time) ?? onDate[0] ?? upcoming[0] ?? null;
  const [departure, fares] = await Promise.all([
    chosen ? loadFlight(chosen.id, now) : null,
    prisma.fareObservation.findMany({ where: { routeAirlineId: ra.id, reviewStatus: "APPROVED" }, orderBy: { observedAt: "desc" }, take: 20 }),
  ]);
  const seen = new Set(upcoming.map((f) => weekdayOf(dayOf(f.date))));

  return {
    routeSlug: resolved.slug,
    flightsThisWeek,
    airline: { code: ra.airline.code, slug: ra.airline.slug, name: ra.airline.name, logo: ra.airline.logo, status: ra.airline.status, statusNote: ra.airline.statusNote },
    routeStatus: ra.status,
    origin: place(origin),
    destination: place(destination),
    note: ra.note,
    services,
    days: WEEKDAYS.filter((d) => seen.has(d)),
    departures: upcoming.map((f) => ({ id: f.id, date: dayOf(f.date), time: f.departureTime, flightNumber: f.flightNumber })),
    chosenDate: departure?.date ?? null,
    askedDate: date,
    sameDay: chosen ? upcoming.filter((f) => dayOf(f.date) === dayOf(chosen.date)).map((f) => ({ id: f.id, time: f.departureTime, flightNumber: f.flightNumber })) : [],
    departure,
    fares: fares.map((f) => ({
      id: f.id,
      amount: Number(f.amount),
      fareName: f.fareName ?? f.cabin,
      kind: f.kind,
      tripType: f.tripType,
      travelDate: f.travelDate ? dayOf(f.travelDate) : null,
      observedAt: f.observedAt.toISOString(),
      sourceUrl: f.sourceUrl,
      sourceHost: f.sourceUrl ? hostOf(f.sourceUrl) : null,
    })),
    verifiedAt: ra.verifiedAt?.toISOString() ?? null,
    verifiedSource: ra.verifiedSourceUrl ? { url: ra.verifiedSourceUrl, host: hostOf(ra.verifiedSourceUrl) ?? ra.verifiedSourceUrl } : null,
    updatedAt: (flights.map((f) => f.updatedAt).sort((a, b) => b.getTime() - a.getTime())[0] ?? ra.updatedAt).toISOString(),
    // The airline is published on this route (checked above), so the route has content.
    indexable: route.status === "PUBLISHED",
  };
}

export type AirlinePage = NonNullable<Awaited<ReturnType<typeof loadAirlinePage>>>;

/**
 * The hub /vols: routes with public flights in the coming four weeks, or published, grouped by
 * departure city. Per route: airlines, flights this week, lowest validated price.
 */
export async function loadHub(now: Date = new Date()) {
  const today = localNow("Africa/Kinshasa", now).day;
  const [routes, flights] = await Promise.all([
    prisma.route.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: {
        origin: { select: { code: true, city: true, slug: true, status: true } },
        destination: { select: { code: true, city: true, slug: true, status: true } },
        airlines: { where: { isPublished: true, airline: { isPublished: true } }, include: { airline: { select: { code: true, name: true, logo: true } } } },
      },
    }),
    prisma.flight.groupBy({
      by: ["routeAirlineId"],
      where: { ...PUBLIC_FLIGHT, date: { gte: new Date(`${today}T00:00:00Z`), lte: new Date(`${addDays(today, 6)}T00:00:00Z`) } },
      _count: true,
    }),
  ]);
  const weekCount = new Map(flights.map((f) => [f.routeAirlineId, f._count]));
  const prices = await latestPrices(routes.flatMap((r) => r.airlines.map((ra) => ra.id)));

  const listed = routes
    .map((r) => {
      const flightsThisWeek = r.airlines.reduce((n, ra) => n + (weekCount.get(ra.id) ?? 0), 0);
      const minPrice = r.airlines
        .map((ra) => prices.get(ra.id))
        .filter((p) => !!p)
        .sort((a, b) => a!.amount - b!.amount)[0] ?? null;
      return {
        slug: r.slug,
        tier: r.tier,
        origin: r.origin,
        destination: r.destination,
        airlines: r.airlines.filter((ra) => (weekCount.get(ra.id) ?? 0) > 0 || prices.has(ra.id)).map((ra) => ra.airline),
        flightsThisWeek,
        minPrice,
        published: hasContent({ status: r.status, publishedAirlines: r.airlines.length, origin: r.origin, destination: r.destination }),
      };
    })
    .filter((r) => r.published || r.flightsThisWeek > 0 || r.minPrice);

  const byCity = new Map<string, typeof listed>();
  for (const r of listed.sort((a, b) => a.tier - b.tier || b.flightsThisWeek - a.flightsThisWeek)) {
    byCity.set(r.origin.city, [...(byCity.get(r.origin.city) ?? []), r]);
  }
  return [...byCity.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "fr"))
    .map(([city, items]) => ({ city, routes: items }));
}

export type Hub = Awaited<ReturnType<typeof loadHub>>;

/** Published routes and their published airlines, for the sitemap, with the date their data last changed. */
export async function sitemapRoutes() {
  const routes = await prisma.route.findMany({
    where: { status: "PUBLISHED" },
    include: {
      origin: { select: { status: true } },
      destination: { select: { status: true } },
      airlines: { where: { isPublished: true, airline: { isPublished: true } }, include: { airline: { select: { slug: true } } } },
    },
  });
  return Promise.all(
    routes
      .filter((r) => hasContent({ status: r.status, publishedAirlines: r.airlines.length, origin: r.origin, destination: r.destination }))
      .map(async (r) => {
        const last = await prisma.flight.aggregate({ where: { routeAirline: { routeId: r.id } }, _max: { updatedAt: true } });
        const lastModified = [r.updatedAt, last._max.updatedAt].filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
        return { slug: r.slug, lastModified, airlines: r.airlines.map((ra) => ra.airline.slug) };
      }),
  );
}

/**
 * Where an old /explore/<flight id> link now goes: the airline page on that departure when the
 * airline is published on the route, otherwise the route page. Null when the flight is unknown.
 */
export async function pathForOldFlight(id: string) {
  const flight = await prisma.flight.findUnique({
    where: { id },
    select: {
      date: true,
      departureTime: true,
      routeAirline: { select: { isPublished: true, route: { select: { slug: true } }, airline: { select: { slug: true, isPublished: true } } } },
    },
  });
  if (!flight) return null;
  const { route, airline, isPublished } = flight.routeAirline;
  return isPublished && airline.isPublished
    ? `/vols/${route.slug}/${airline.slug}?date=${dayOf(flight.date)}&heure=${flight.departureTime}`
    : `/vols/${route.slug}`;
}
