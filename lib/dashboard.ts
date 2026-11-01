import "server-only";
import prisma from "@/lib/prisma";
import { loadRouteBoard, type BoardRoute } from "@/lib/routeBoard";
import { attentionRank, isUpToDate, KNOWN_AHEAD_DAYS, localNow } from "@/lib/routeStatus";
import { addDays } from "@/lib/schedule";

/**
 * The back-office home (B-1 in docs/PLAN.md): what needs work today, read on each visit.
 * Built on the routes board's computed values, so both screens always agree.
 */

export async function loadDashboard(now: Date = new Date()) {
  const today = localNow("Africa/Kinshasa", now).day;
  const [routes, requests, newRequests, messages, newMessages, airports, airlines, batches, loose] = await Promise.all([
    loadRouteBoard(now),
    prisma.request.findMany({
      where: { status: "NEW" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { route: { select: { slug: true } } },
    }),
    prisma.request.count({ where: { status: "NEW" } }),
    prisma.contactMessage.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.airport.findMany({ where: { status: { not: "OPEN" } }, orderBy: { city: "asc" } }),
    prisma.airline.findMany({ where: { status: { not: "OPERATING" } }, orderBy: { name: "asc" } }),
    prisma.changeBatch.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.changeLog.findMany({ where: { batchId: null }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const live = routes.filter((r) => r.status !== "ARCHIVED");
  const p1 = live.filter((r) => r.tier === 1);
  const routeById = new Map(routes.map((r) => [r.id, r]));
  const withAirline = (r: BoardRoute) => r.airlines.some((a) => a.status === "ACTIVE");

  return {
    today,
    kpis: {
      p1UpToDate: p1.filter((r) => isUpToDate(r, today)).length,
      p1Total: p1.length,
      flightsNext7Days: live.reduce((n, r) => n + r.flightsNext7Days, 0),
      routesWithFlights: live.filter((r) => r.flightsNext7Days > 0).length,
      newRequests,
      newMessages,
      pendingPrices: live.reduce((n, r) => n + r.prices.pending, 0),
      routesWithPendingPrices: live.filter((r) => r.prices.pending > 0).length,
    },
    // Priority routes with no airline yet: the first thing to set up (they are the M3 test).
    p1ToSetUp: p1.filter((r) => !withAirline(r)).sort((a, b) => a.slug.localeCompare(b.slug)),
    // Checked too long ago, or never: the board's "needs attention" order, priority first.
    toVerify: live
      .filter((r) => withAirline(r) && attentionRank(r) <= 1)
      .sort((a, b) => a.tier - b.tier || attentionRank(a) - attentionRank(b) || a.slug.localeCompare(b.slug)),
    // Flights run out within two weeks: copy a week or apply the next timetable.
    toExtend: live
      .filter((r) => withAirline(r) && (!r.knownUntil || r.knownUntil < addDays(today, KNOWN_AHEAD_DAYS)))
      .sort((a, b) => (a.knownUntil ?? "").localeCompare(b.knownUntil ?? "") || a.tier - b.tier),
    pricesToReview: live.filter((r) => r.prices.pending > 0).sort((a, b) => a.tier - b.tier || b.prices.pending - a.prices.pending),
    requests: requests.map((q) => ({
      id: q.id,
      name: q.clientName,
      from: q.originCity,
      to: q.destinationCity,
      travelDate: q.travelDate.toISOString().slice(0, 10),
      travelers: q.travelers,
      createdAt: q.createdAt.toISOString(),
      routeSlug: q.route?.slug ?? null,
    })),
    messages: messages.map((m) => ({ id: m.id, name: m.name, topic: m.topic, message: m.message, createdAt: m.createdAt.toISOString() })),
    statuses: [
      ...airports.map((a) => ({
        kind: "airport" as const,
        id: a.id,
        name: `Aéroport de ${a.city}`,
        status: a.status === "CLOSED" ? "fermé" : "activité réduite",
        since: a.statusSince?.toISOString() ?? null,
        href: `/dashboard/airports/${a.id}`,
      })),
      ...airlines.map((a) => ({
        kind: "airline" as const,
        id: a.id,
        name: a.name,
        status: a.status === "SUSPENDED" ? "suspendue" : "a cessé ses activités",
        since: a.statusSince?.toISOString() ?? null,
        href: `/dashboard/airlines/${a.id}`,
      })),
    ],
    activity: [
      ...batches.map((b) => ({
        id: b.id,
        at: b.createdAt.toISOString(),
        actor: b.actor,
        summary: b.summary,
        undone: !!b.undoneAt,
        route: routeById.get(b.routeId) ?? null,
      })),
      ...loose.map((l) => ({
        id: l.id,
        at: l.createdAt.toISOString(),
        actor: l.actor,
        summary: l.summary,
        undone: false,
        route: l.routeId ? (routeById.get(l.routeId) ?? null) : null,
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8)
      .map(({ route, ...item }) => ({ ...item, route: route ? { slug: route.slug, origin: route.origin.city, destination: route.destination.city } : null })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
