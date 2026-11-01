import "server-only";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import type { BatchAction, ChangeAction, Flight, Prisma, Weekday } from "@/lib/generated/prisma/client";
import { changedFields, snapshot } from "@/lib/changeLog";
import { FRESH_DAYS, dayOf, localNow } from "@/lib/routeStatus";
import { addDays, mondayOf, pickFields, planCancel, planCopyWeek, planDay, planSchedule, type DayFlight, type FlightFields, type StoredFlight } from "@/lib/schedule";
import { formatDayMonth, formatFlightNumber, formatPrice, formatWeekdays } from "@/lib/format";

/**
 * Route workspace actions (docs/ROUTE-MODEL.md §6.2). Each one runs in a transaction, as one
 * ChangeBatch with a ChangeLog row per record it touches, so it can be undone as a whole.
 */

type Tx = Prisma.TransactionClient;
type Db = typeof prisma | Tx;

// Bulk actions write up to a few hundred rows to a remote database: more than the 5 s default.
const TX = { timeout: 30_000, maxWait: 10_000 };

/** A refusal the operator can act on (shown as is, in French). */
export class WorkspaceError extends Error {}

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
export const toStored = (f: Flight): StoredFlight => ({ ...pickFields(f), id: f.id, date: dayOf(f.date), status: f.status });

const flightLabel = (f: { flightNumber: string | null; date: Date | string }) =>
  `${f.flightNumber ? formatFlightNumber(f.flightNumber) : "Vol sans numéro"} du ${formatDayMonth(typeof f.date === "string" ? toDate(f.date) : f.date)}`;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// The fields a workspace action can change on a flight; the change log records them before and after.
const logged = (f: Flight) => ({ ...pickFields(f), status: f.status, verifiedAt: f.verifiedAt, sourceUrl: f.sourceUrl });

export async function loadRouteAirline(db: Db, id: string) {
  const ra = await db.routeAirline.findUnique({
    where: { id },
    include: { airline: true, route: { include: { origin: true, destination: true } } },
  });
  if (!ra) throw new WorkspaceError("Compagnie introuvable sur cette route.");
  return ra;
}
type RouteAirlineFull = Awaited<ReturnType<typeof loadRouteAirline>>;

/** Stops must be known airports, once each, and not the route's own ends. */
async function checkVia(db: Db, ra: RouteAirlineFull, via: string[]) {
  if (via.length === 0) return;
  if (new Set(via).size !== via.length) throw new WorkspaceError("Une escale est en double.");
  if (via.includes(ra.route.origin.code) || via.includes(ra.route.destination.code)) {
    throw new WorkspaceError("Une escale ne peut pas être le départ ou l'arrivée de la route.");
  }
  if ((await db.airport.count({ where: { code: { in: via } } })) !== via.length) throw new WorkspaceError("Escale inconnue.");
}

/** Opens a batch; `log` collects ChangeLog rows, `close` writes them. */
async function openBatch(
  tx: Tx,
  meta: { actor: string; ra: RouteAirlineFull; action: BatchAction; summary: string; params?: Prisma.InputJsonValue },
) {
  const batch = await tx.changeBatch.create({
    data: { actor: meta.actor, routeId: meta.ra.routeId, routeAirlineId: meta.ra.id, action: meta.action, summary: meta.summary, params: meta.params },
  });
  const entries: Prisma.ChangeLogCreateManyInput[] = [];
  return {
    id: batch.id,
    summary: batch.summary,
    log(entity: string, entityId: string, action: ChangeAction, summary: string, changes: object) {
      entries.push({ actor: meta.actor, entity, entityId, action, summary, routeId: meta.ra.routeId, batchId: batch.id, changes: snapshot(changes) });
    },
    async close() {
      if (entries.length) await tx.changeLog.createMany({ data: entries });
      return { id: batch.id, summary: batch.summary };
    },
  };
}
type Batch = Awaited<ReturnType<typeof openBatch>>;

async function addFlights(
  tx: Tx,
  batch: Batch,
  ra: RouteAirlineFull,
  flights: (FlightFields & { date: string; status?: "SCHEDULED" | "CANCELLED" })[],
  extra: { verifiedAt: Date | null; sourceUrl: string | null },
) {
  if (flights.length === 0) return;
  const rows: Prisma.FlightCreateManyInput[] = flights.map((f) => ({
    ...pickFields(f),
    id: randomUUID(),
    routeAirlineId: ra.id,
    date: toDate(f.date),
    status: f.status ?? "SCHEDULED",
    source: "MANUAL",
    sourceUrl: extra.sourceUrl,
    verifiedAt: extra.verifiedAt,
    reviewStatus: "APPROVED", // operator entries; imports will start PENDING
    batchId: batch.id,
  }));
  await tx.flight.createMany({ data: rows });
  for (const row of rows) batch.log("Flight", row.id!, "CREATE", `${flightLabel(row as { flightNumber: string | null; date: Date })} ajouté`, row);
}

async function updateFlight(tx: Tx, batch: Batch, before: Flight, data: Prisma.FlightUpdateInput, verb: string) {
  const after = await tx.flight.update({ where: { id: before.id }, data });
  const changes = changedFields(logged(before), logged(after));
  if (Object.keys(changes).length > 0) batch.log("Flight", before.id, "UPDATE", `${flightLabel(after)} ${verb}`, changes);
}

const describe = (counts: { add: number; update: number; remove?: number; cancel?: number }) =>
  [
    counts.add && plural(counts.add, "vol ajouté", "vols ajoutés"),
    counts.update && plural(counts.update, "vol modifié", "vols modifiés"),
    counts.remove && plural(counts.remove, "vol supprimé", "vols supprimés"),
    counts.cancel && plural(counts.cancel, "vol annulé", "vols annulés"),
  ]
    .filter(Boolean)
    .join(", ") || "aucun changement";

const range = (from: string, to: string) => `du ${formatDayMonth(toDate(from))} au ${formatDayMonth(toDate(to))}`;

/** "Appliquer un horaire". Preview returns the plan; apply writes it as one batch. */
export async function applySchedule(
  routeAirlineId: string,
  input: FlightFields & { days: Weekday[]; from: string; to: string; sourceUrl: string | null },
  actor: string,
  apply: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    await checkVia(tx, ra, input.via);
    const rows = await tx.flight.findMany({ where: { routeAirlineId, date: { gte: toDate(input.from), lte: toDate(input.to) } } });
    const plan = planSchedule(rows.map(toStored), input);
    if (!apply || plan.add.length + plan.update.length === 0) return { plan, batch: null };

    const name = input.flightNumber ? formatFlightNumber(input.flightNumber) : "sans numéro";
    const summary =
      `Horaire ${name} ${input.departureTime}–${input.arrivalTime} (${formatWeekdays(input.days)}) ${range(input.from, input.to)} : ` +
      describe({ add: plan.add.length, update: plan.update.length });
    const batch = await openBatch(tx, { actor, ra, action: "APPLY_SCHEDULE", summary, params: { ...input } });
    const now = new Date();
    await addFlights(tx, batch, ra, plan.add, { verifiedAt: now, sourceUrl: input.sourceUrl });
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const u of plan.update) {
      const before = byId.get(u.id)!;
      await updateFlight(tx, batch, before, { ...u.after, verifiedAt: now, sourceUrl: input.sourceUrl ?? before.sourceUrl }, "modifié");
    }
    return { plan, batch: await batch.close() };
  }, TX);
}

/** "Copier une semaine": copies are not verified until someone checks them. */
export async function copyWeek(routeAirlineId: string, input: { weekStart: string; weeks: number }, actor: string, apply: boolean) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    if (mondayOf(input.weekStart) !== input.weekStart) throw new WorkspaceError("Une semaine commence un lundi.");
    const until = addDays(input.weekStart, 7 * input.weeks + 6);
    const rows = await tx.flight.findMany({ where: { routeAirlineId, date: { gte: toDate(input.weekStart), lte: toDate(until) } } });
    const plan = planCopyWeek(rows.map(toStored), input.weekStart, input.weeks);
    if (!apply || plan.add.length === 0) return { plan, batch: null };

    const summary = `Semaine ${range(input.weekStart, addDays(input.weekStart, 6))} copiée sur ${plural(input.weeks, "semaine", "semaines")} : ${describe({ add: plan.add.length, update: 0 })}`;
    const batch = await openBatch(tx, { actor, ra, action: "COPY_WEEK", summary, params: input });
    await addFlights(tx, batch, ra, plan.add, { verifiedAt: null, sourceUrl: null });
    return { plan, batch: await batch.close() };
  }, TX);
}

/** "Annuler des vols": marks them cancelled; they stay visible, struck through. */
export async function cancelFlights(
  routeAirlineId: string,
  input: { from: string; to: string; days: Weekday[]; flightNumber: string | null },
  actor: string,
  apply: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    const rows = await tx.flight.findMany({ where: { routeAirlineId, date: { gte: toDate(input.from), lte: toDate(input.to) } } });
    const targets = planCancel(rows.map(toStored), input);
    if (!apply || targets.length === 0) return { flights: targets, batch: null };

    const summary = `${plural(targets.length, "vol annulé", "vols annulés")} ${range(input.from, input.to)}`;
    const batch = await openBatch(tx, { actor, ra, action: "CANCEL_FLIGHTS", summary, params: input });
    await tx.flight.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { status: "CANCELLED" } });
    for (const t of targets) batch.log("Flight", t.id, "UPDATE", `${flightLabel(t)} annulé`, { status: ["SCHEDULED", "CANCELLED"] });
    return { flights: targets, batch: await batch.close() };
  }, TX);
}

/** One date edited by hand: the typed list replaces what was stored. */
export async function editDay(routeAirlineId: string, input: { date: string; flights: DayFlight[] }, actor: string) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    for (const f of input.flights) await checkVia(tx, ra, f.via);
    const rows = await tx.flight.findMany({ where: { routeAirlineId, date: toDate(input.date) } });
    const plan = planDay(rows.map(toStored), input.date, input.flights);
    if ("error" in plan) throw new WorkspaceError(plan.error!);
    if (plan.add.length + plan.update.length + plan.remove.length === 0) return { batch: null };

    const summary = `Vols du ${formatDayMonth(toDate(input.date))} : ${describe({ add: plan.add.length, update: plan.update.length, remove: plan.remove.length })}`;
    const batch = await openBatch(tx, { actor, ra, action: "EDIT_DAY", summary });
    const now = new Date();
    const byId = new Map(rows.map((r) => [r.id, r]));
    // Deletes first, then changes, then additions: a number or time freed by one can be reused by another.
    for (const r of plan.remove) {
      const row = byId.get(r.id)!;
      await tx.flight.delete({ where: { id: r.id } });
      batch.log("Flight", r.id, "DELETE", `${flightLabel(row)} supprimé`, row);
    }
    for (const u of plan.update) {
      await updateFlight(tx, batch, byId.get(u.id)!, { ...pickFields(u.after), status: u.after.status, verifiedAt: now }, "modifié");
    }
    await addFlights(tx, batch, ra, plan.add, { verifiedAt: now, sourceUrl: null });
    return { batch: await batch.close() };
  }, TX);
}

/** "Tout est vérifié": the airline on this route and its next 7 days of flights were checked today. */
export async function verifyAll(routeAirlineId: string, input: { sourceUrl: string | null }, actor: string) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    const today = localNow(ra.route.origin.timezone).day;
    const until = addDays(today, FRESH_DAYS - 1);
    const rows = await tx.flight.findMany({
      where: { routeAirlineId, status: "SCHEDULED", date: { gte: toDate(today), lte: toDate(until) } },
    });
    const summary = `Tout vérifié : la compagnie sur cette route et ${plural(rows.length, "vol", "vols")} ${range(today, until)}`;
    const batch = await openBatch(tx, { actor, ra, action: "VERIFY", summary, params: input });
    const now = new Date();
    const after = await tx.routeAirline.update({
      where: { id: ra.id },
      data: { verifiedAt: now, verifiedSourceUrl: input.sourceUrl ?? ra.verifiedSourceUrl },
    });
    batch.log(
      "RouteAirline", ra.id, "UPDATE", `${ra.airline.code} vérifiée sur cette route`,
      changedFields({ verifiedAt: ra.verifiedAt, verifiedSourceUrl: ra.verifiedSourceUrl }, { verifiedAt: after.verifiedAt, verifiedSourceUrl: after.verifiedSourceUrl }),
    );
    await tx.flight.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { verifiedAt: now } });
    for (const row of rows) batch.log("Flight", row.id, "UPDATE", `${flightLabel(row)} vérifié`, changedFields({ verifiedAt: row.verifiedAt }, { verifiedAt: now }));
    return { batch: await batch.close(), flights: rows.length };
  }, TX);
}

// Prices (RW-4). Operator entries are validated at once; imports wait in "À valider".

const fareLabel = (f: { amount: unknown; fareName?: string | null; cabin?: string | null }) =>
  `${formatPrice(String(f.amount))}${f.fareName ?? f.cabin ? ` (${f.fareName ?? f.cabin})` : ""}`;

/** "+ Prix observé": amount, fare name and source; observed today unless said otherwise. */
export async function addFare(
  routeAirlineId: string,
  input: {
    amount: number;
    fareName: string | null;
    sourceUrl: string | null;
    observedAt: string | null;
    travelDate: string | null;
    flightNumber: string | null;
    roundTrip: boolean;
    note: string | null;
  },
  actor: string,
) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    const observedAt = input.observedAt ? toDate(input.observedAt) : new Date();
    const data: Prisma.FareObservationUncheckedCreateInput = {
      id: randomUUID(),
      routeAirlineId,
      amount: input.amount,
      currency: "USD",
      kind: input.travelDate ? "QUOTE" : "FROM_PRICE",
      tripType: input.roundTrip ? "ROUND_TRIP" : "ONE_WAY",
      fareName: input.fareName,
      flightNumber: input.flightNumber,
      travelDate: input.travelDate ? toDate(input.travelDate) : null,
      observedAt,
      source: "MANUAL",
      sourceUrl: input.sourceUrl,
      note: input.note,
      reviewStatus: "APPROVED",
    };
    const summary = `Prix ajouté : ${fareLabel(data)}${input.travelDate ? ` pour le vol du ${formatDayMonth(toDate(input.travelDate))}` : ""}, observé le ${formatDayMonth(observedAt)}`;
    const batch = await openBatch(tx, { actor, ra, action: "FARE_ADD", summary });
    const row = await tx.fareObservation.create({ data });
    batch.log("FareObservation", row.id, "CREATE", summary, row);
    return { batch: await batch.close() };
  }, TX);
}

/** Validates or rejects prices waiting for review (imports, or the ones copied from the old schedules). */
export async function reviewFares(routeAirlineId: string, input: { ids: string[]; decision: "APPROVED" | "REJECTED" }, actor: string) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    const rows = await tx.fareObservation.findMany({ where: { id: { in: input.ids }, routeAirlineId, reviewStatus: "PENDING" } });
    if (rows.length === 0) throw new WorkspaceError("Aucun prix à valider parmi ceux-là.");
    const verb = input.decision === "APPROVED" ? "validé" : "rejeté";
    const summary = rows.length === 1 ? `Prix ${verb} : ${fareLabel(rows[0])}` : `${rows.length} prix ${verb}s`;
    const batch = await openBatch(tx, { actor, ra, action: "FARE_REVIEW", summary });
    await tx.fareObservation.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { reviewStatus: input.decision } });
    for (const r of rows) batch.log("FareObservation", r.id, "UPDATE", `Prix ${verb} : ${fareLabel(r)}`, { reviewStatus: ["PENDING", input.decision] });
    return { batch: await batch.close() };
  }, TX);
}

/** A price entered by mistake. A real price that went out of date is kept: it is history. */
export async function deleteFare(routeAirlineId: string, fareId: string, actor: string) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    const row = await tx.fareObservation.findFirst({ where: { id: fareId, routeAirlineId } });
    if (!row) throw new WorkspaceError("Prix introuvable sur cette compagnie.");
    const summary = `Prix supprimé : ${fareLabel(row)}, observé le ${formatDayMonth(row.observedAt)}`;
    const batch = await openBatch(tx, { actor, ra, action: "FARE_DELETE", summary });
    await tx.fareObservation.delete({ where: { id: row.id } });
    batch.log("FareObservation", row.id, "DELETE", summary, row);
    return { batch: await batch.close() };
  }, TX);
}

/** The airline's public note on this route: baggage, fare names, how to book. */
export async function editNote(routeAirlineId: string, input: { note: string | null }, actor: string) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    if ((ra.note ?? null) === input.note) return { batch: null };
    const summary = input.note ? `Note de ${ra.airline.code} sur cette route modifiée` : `Note de ${ra.airline.code} sur cette route effacée`;
    const batch = await openBatch(tx, { actor, ra, action: "NOTE_EDIT", summary });
    await tx.routeAirline.update({ where: { id: ra.id }, data: { note: input.note } });
    batch.log("RouteAirline", ra.id, "UPDATE", summary, { note: [ra.note, input.note] });
    return { batch: await batch.close() };
  }, TX);
}

const DATE_FIELDS = new Set(["date", "verifiedAt", "createdAt", "updatedAt", "observedAt", "travelDate"]);
const revive = (key: string, value: unknown) => (DATE_FIELDS.has(key) && typeof value === "string" ? new Date(value) : value);

/** Undoes the latest batch of this airline on this route that is not undone yet. */
export async function undoLatest(routeAirlineId: string, actor: string) {
  return prisma.$transaction(async (tx) => {
    const ra = await loadRouteAirline(tx, routeAirlineId);
    const target = await tx.changeBatch.findFirst({
      where: { routeAirlineId, undoneAt: null, action: { not: "UNDO" } },
      orderBy: { createdAt: "desc" },
    });
    if (!target) throw new WorkspaceError("Rien à annuler.");
    const entries = await tx.changeLog.findMany({ where: { batchId: target.id } });
    // "Défait", not "Annulé": "annuler" already means cancelling flights in this workspace.
    const undo = await openBatch(tx, { actor, ra, action: "UNDO", summary: `Défait : ${target.summary}` });

    // Reverse order of kinds: remove what was added, restore what was changed, recreate what was deleted.
    const added = await tx.flight.findMany({
      where: { id: { in: entries.filter((e) => e.entity === "Flight" && e.action === "CREATE").map((e) => e.entityId) } },
    });
    await tx.flight.deleteMany({ where: { id: { in: added.map((r) => r.id) } } });
    for (const row of added) undo.log("Flight", row.id, "DELETE", `${flightLabel(row)} retiré (annulation)`, row);
    for (const e of entries.filter((e) => e.entity === "FareObservation" && e.action === "CREATE")) {
      const row = await tx.fareObservation.findUnique({ where: { id: e.entityId } });
      if (!row) continue;
      await tx.fareObservation.delete({ where: { id: row.id } });
      undo.log("FareObservation", row.id, "DELETE", `Prix retiré : ${fareLabel(row)} (annulation)`, row);
    }
    for (const e of entries.filter((e) => e.action === "UPDATE")) {
      const changes = (e.changes ?? {}) as Record<string, [unknown, unknown]>;
      const data = Object.fromEntries(Object.entries(changes).map(([key, [before]]) => [key, revive(key, before)]));
      if (e.entity === "Flight") {
        const before = await tx.flight.findUnique({ where: { id: e.entityId } });
        if (!before) continue;
        await updateFlight(tx, undo, before, data, "rétabli");
      } else if (e.entity === "RouteAirline") {
        const before = await tx.routeAirline.findUniqueOrThrow({ where: { id: e.entityId } });
        const after = await tx.routeAirline.update({ where: { id: e.entityId }, data });
        const what = "note" in changes ? "note rétablie" : "vérification rétablie";
        undo.log("RouteAirline", e.entityId, "UPDATE", `${ra.airline.code} : ${what}`, changedFields(before, after));
      } else if (e.entity === "FareObservation") {
        const before = await tx.fareObservation.findUnique({ where: { id: e.entityId } });
        if (!before) continue;
        const after = await tx.fareObservation.update({ where: { id: e.entityId }, data });
        undo.log("FareObservation", e.entityId, "UPDATE", `Prix remis à valider : ${fareLabel(after)}`, changedFields(before, after));
      }
    }
    for (const e of entries.filter((e) => e.action === "DELETE")) {
      const record = Object.fromEntries(Object.entries((e.changes ?? {}) as Record<string, unknown>).map(([k, v]) => [k, revive(k, v)]));
      if (e.entity === "Flight") {
        const row = await tx.flight.create({ data: record as Prisma.FlightUncheckedCreateInput });
        undo.log("Flight", row.id, "CREATE", `${flightLabel(row)} rétabli (annulation)`, row);
      } else if (e.entity === "FareObservation") {
        const row = await tx.fareObservation.create({ data: record as Prisma.FareObservationUncheckedCreateInput });
        undo.log("FareObservation", row.id, "CREATE", `Prix rétabli : ${fareLabel(row)} (annulation)`, row);
      }
    }
    await tx.changeBatch.update({ where: { id: target.id }, data: { undoneAt: new Date(), undoneBy: actor } });
    return { undone: target.summary, batch: await undo.close() };
  }, TX);
}
