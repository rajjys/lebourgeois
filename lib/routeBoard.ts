import "server-only";
import prisma from "@/lib/prisma";
import { byAttention, dayOf, freshnessOf, isUpcoming, localNow, routeFreshness, type Freshness } from "@/lib/routeStatus";
import { addDays, mondayOf } from "@/lib/schedule";

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

export const CALENDAR_WEEKS = 8;
const HISTORY_SIZE = 40;

/** A price as the workspace shows it. */
export type WorkspaceFare = {
  id: string;
  amount: number;
  fareName: string | null;
  kind: "FROM_PRICE" | "QUOTE";
  tripType: "ONE_WAY" | "ROUND_TRIP";
  travelDate: string | null;
  observedAt: string;
  flightNumber: string | null;
  source: "MANUAL" | "AIRLINE_TIMETABLE" | "AIRLINE_WEBSITE";
  sourceUrl: string | null;
  note: string | null;
  reviewStatus: "PENDING" | "APPROVED" | "REJECTED";
};

/** One line of the route's history: a workspace action (with its detail lines) or a single edit. */
export type HistoryItem = {
  id: string;
  at: string;
  actor: string;
  airline: string | null;
  summary: string;
  undone: boolean;
  isUndo: boolean;
  lines: string[];
};

/** A flight as the route workspace shows it (dates as "YYYY-MM-DD"). */
export type WorkspaceFlight = {
  id: string;
  date: string;
  flightNumber: string | null;
  departureTime: string;
  arrivalTime: string;
  arrivalDayOffset: number;
  via: string[];
  aircraft: string | null;
  status: "SCHEDULED" | "CANCELLED";
  reviewStatus: "PENDING" | "APPROVED" | "REJECTED";
  verified: boolean;
};

/**
 * One route with everything under it, for its back-office page and workspace (ROUTE-MODEL §6.2).
 * `weekStart` (a Monday) moves the 8-week calendar; it starts on the current week by default.
 * Null when the slug is unknown.
 */
export async function loadRouteDetail(slug: string, weekStart?: string, now: Date = new Date()) {
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
  const start = weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart) ? mondayOf(weekStart) : mondayOf(local.day);
  const end = addDays(start, CALENDAR_WEEKS * 7 - 1);
  const ids = route.airlines.map((ra) => ra.id);
  const [calendar, upcoming, lastDays, undoable, schedules, others, reverse, batches, loose] = await Promise.all([
    prisma.flight.findMany({
      where: { routeAirlineId: { in: ids }, date: { gte: day(start), lte: day(end) } },
      orderBy: [{ date: "asc" }, { departureTime: "asc" }],
    }),
    prisma.flight.findMany({
      where: { routeAirlineId: { in: ids }, date: { gte: day(local.day) }, status: "SCHEDULED", reviewStatus: "APPROVED" },
      orderBy: [{ date: "asc" }, { departureTime: "asc" }],
      take: 50,
    }),
    prisma.flight.groupBy({
      by: ["routeAirlineId"],
      where: { routeAirlineId: { in: ids }, status: "SCHEDULED", reviewStatus: "APPROVED" },
      _max: { date: true },
    }),
    // Latest action per airline that can still be undone, and the last schedule applied (to pre-fill the form).
    prisma.changeBatch.findMany({
      where: { routeAirlineId: { in: ids }, undoneAt: null, action: { not: "UNDO" } },
      orderBy: { createdAt: "desc" },
      distinct: ["routeAirlineId"],
      select: { routeAirlineId: true, summary: true, createdAt: true },
    }),
    prisma.changeBatch.findMany({
      where: { routeAirlineId: { in: ids }, action: "APPLY_SCHEDULE" },
      orderBy: { createdAt: "desc" },
      distinct: ["routeAirlineId"],
      select: { routeAirlineId: true, params: true },
    }),
    prisma.airline.findMany({
      where: { id: { notIn: route.airlines.map((ra) => ra.airlineId) } },
      select: { id: true, code: true, name: true, status: true, isPublished: true },
      orderBy: { name: "asc" },
    }),
    prisma.route.findUnique({
      where: { originId_destinationId: { originId: route.destinationId, destinationId: route.originId } },
      select: { slug: true },
    }),
    // History (RW-4): workspace actions, and single edits made outside them (settings, airline added…).
    prisma.changeBatch.findMany({ where: { routeId: route.id }, orderBy: { createdAt: "desc" }, take: HISTORY_SIZE }),
    prisma.changeLog.findMany({ where: { routeId: route.id, batchId: null }, orderBy: { createdAt: "desc" }, take: HISTORY_SIZE }),
  ]);
  const batchLines = await prisma.changeLog.findMany({
    where: { batchId: { in: batches.map((b) => b.id) } },
    orderBy: { createdAt: "asc" },
    select: { batchId: true, summary: true },
  });
  const linesBy = new Map<string, string[]>();
  for (const l of batchLines) linesBy.set(l.batchId!, [...(linesBy.get(l.batchId!) ?? []), l.summary]);
  const codeBy = new Map(route.airlines.map((ra) => [ra.id, ra.airline.code]));
  const history: HistoryItem[] = [
    ...batches.map((b) => ({
      id: b.id,
      at: b.createdAt.toISOString(),
      actor: b.actor,
      airline: codeBy.get(b.routeAirlineId) ?? null,
      summary: b.summary,
      undone: !!b.undoneAt,
      isUndo: b.action === "UNDO",
      lines: linesBy.get(b.id) ?? [],
    })),
    ...loose.map((l) => ({ id: l.id, at: l.createdAt.toISOString(), actor: l.actor, airline: null, summary: l.summary, undone: false, isUndo: false, lines: [] })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, HISTORY_SIZE);
  const lastDayBy = new Map(lastDays.map((l) => [l.routeAirlineId, l._max.date]));
  const undoBy = new Map(undoable.map((b) => [b.routeAirlineId, { summary: b.summary, at: b.createdAt.toISOString() }]));
  const scheduleBy = new Map(schedules.map((b) => [b.routeAirlineId, b.params]));

  return {
    route,
    reverseSlug: reverse?.slug ?? null,
    freshness: routeFreshness(route.airlines, now),
    history,
    workspace: {
      today: local.day,
      start,
      weeks: CALENDAR_WEEKS,
      origin: route.origin.code,
      destination: route.destination.code,
      airlines: route.airlines.map((ra) => {
        const next = upcoming.find((f) => f.routeAirlineId === ra.id && isUpcoming(f, local));
        const last = lastDayBy.get(ra.id);
        return {
          id: ra.id,
          code: ra.airline.code,
          name: ra.airline.name,
          airlineStatus: ra.airline.status,
          status: ra.status,
          isPublished: ra.isPublished,
          verifiedSourceUrl: ra.verifiedSourceUrl,
          freshness: freshnessOf(ra.verifiedAt, now),
          knownUntil: last ? dayOf(last) : null,
          next: next ? { date: dayOf(next.date), time: next.departureTime, flightNumber: next.flightNumber } : null,
          flights: calendar
            .filter((f) => f.routeAirlineId === ra.id)
            .map((f): WorkspaceFlight => ({
              id: f.id,
              date: dayOf(f.date),
              flightNumber: f.flightNumber,
              departureTime: f.departureTime,
              arrivalTime: f.arrivalTime,
              arrivalDayOffset: f.arrivalDayOffset,
              via: f.via,
              aircraft: f.aircraft,
              status: f.status,
              reviewStatus: f.reviewStatus,
              verified: !!f.verifiedAt,
            })),
          note: ra.note,
          fares: ra.fares.map(
            (f): WorkspaceFare => ({
              id: f.id,
              amount: Number(f.amount),
              fareName: f.fareName ?? f.cabin,
              kind: f.kind,
              tripType: f.tripType,
              travelDate: f.travelDate ? dayOf(f.travelDate) : null,
              observedAt: f.observedAt.toISOString(),
              flightNumber: f.flightNumber,
              source: f.source,
              sourceUrl: f.sourceUrl,
              note: f.note,
              reviewStatus: f.reviewStatus,
            }),
          ),
          lastAction: undoBy.get(ra.id) ?? null,
          lastSchedule: (scheduleBy.get(ra.id) ?? null) as Record<string, unknown> | null,
        };
      }),
      otherAirlines: others,
    },
  };
}

const day = (d: string) => new Date(`${d}T00:00:00Z`);

export type RouteDetail = NonNullable<Awaited<ReturnType<typeof loadRouteDetail>>>;
export type WorkspaceData = RouteDetail["workspace"];
export type WorkspaceAirline = WorkspaceData["airlines"][number];
