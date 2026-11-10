/**
 * Brings an airline's stored flights in line with a newer timetable document (plan item C-10).
 * The document is typed in by hand under data/timetables/ (an importer, C-2, stays paused).
 *
 * In the window (the document's first date, or today if later, up to --to), for every city pair
 * the airline flies or flew: adds the flights the document lists, updates the ones whose times or
 * stops changed, re-dates the verification of the ones it confirms, and removes the scheduled
 * ones it no longer lists. Cancelled flights are left alone. Flights outside the window are not
 * touched. Each airline-on-route's changes are one "Appliquer un horaire" batch, so the route
 * workspace's "Défaire" reverses them. A pair with no airline-on-route yet gets one, unpublished.
 *
 *   npx tsx scripts/update-timetable.ts caa-2026-11-11                          local, preview
 *   npx tsx scripts/update-timetable.ts caa-2026-11-11 --apply                  local, write
 *   npx tsx scripts/update-timetable.ts caa-2026-11-11 --production             production, preview
 *   npx tsx scripts/update-timetable.ts caa-2026-11-11 --production --apply     production, write
 * --to=YYYY-MM-DD sets the end of the window; by default, the airline's last stored flight date,
 * so the document replaces what is there without extending how far ahead the site shows.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Flight, type Prisma } from "../lib/generated/prisma/client";
import { ensureRouteAirline } from "../lib/routes";
import { localNow, dayOf } from "../lib/routeStatus";
import { pickFields, type StoredFlight } from "../lib/schedule";
import { blockedAdditions, planTimetable, wantedFlights, type Timetable, type TimetablePlan } from "../lib/timetable";
import { changedFields } from "../lib/changeLog";
import { formatDayMonth, formatFlightNumber } from "../lib/format";
import { caa20261111 } from "../data/timetables/caa-2026-11-11";

const TIMETABLES: Record<string, Timetable> = { "caa-2026-11-11": caa20261111 };

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--"));
const timetable = name ? TIMETABLES[name] : undefined;
if (!timetable) {
  console.error(`Usage: npx tsx scripts/update-timetable.ts <${Object.keys(TIMETABLES).join("|")}> [--production] [--apply] [--to=YYYY-MM-DD]`);
  process.exit(1);
}
const production = args.includes("--production");
const apply = args.includes("--apply");
const toArg = args.find((a) => a.startsWith("--to="))?.split("=")[1];
if (toArg && !/^\d{4}-\d{2}-\d{2}$/.test(toArg)) throw new Error("--to must be YYYY-MM-DD");

// Never dotenv/config: .env holds production. Local unless --production says otherwise.
const env = (file: string) => {
  try {
    return parse(readFileSync(file));
  } catch {
    return {};
  }
};
const isLocal = (url: string) => ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);
const url = production ? env(".env").DATABASE_URL : env(".env.local").DATABASE_URL;
if (!url) throw new Error(production ? "No DATABASE_URL in .env" : "No DATABASE_URL in .env.local");
if (!production && !isLocal(url)) throw new Error("Without --production the target must be the local database");
if (production && isLocal(url)) throw new Error("--production points at a local database: check .env");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const ACTOR = "script:update-timetable";
const TX = { timeout: 60_000, maxWait: 20_000 };
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toStored = (f: Flight): StoredFlight => ({ ...pickFields(f), id: f.id, date: dayOf(f.date), status: f.status });
const short = (f: { flightNumber: string | null; departureTime: string; arrivalTime: string; via: string[] }) =>
  `${f.flightNumber ?? "sans n°"} ${f.departureTime}-${f.arrivalTime}${f.via.length ? ` via ${f.via.join(",")}` : ""}`;
const label = (f: { flightNumber: string | null; date: string }) =>
  `${f.flightNumber ? formatFlightNumber(f.flightNumber) : "Vol sans numéro"} du ${formatDayMonth(toDate(f.date))}`;

async function main() {
  const tt = timetable!;
  const airline = await prisma.airline.findUniqueOrThrow({ where: { code: tt.airline } });
  const today = localNow("Africa/Kinshasa").day;
  const from = tt.validFrom > today ? tt.validFrom : today;
  const last = await prisma.flight.findFirst({
    where: { routeAirline: { airlineId: airline.id } },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const to = toArg ?? (last ? dayOf(last.date) : from);
  if (to < from) throw new Error(`Nothing to do: the window ${from} → ${to} is empty (pass --to=)`);

  console.log(`Target: ${new URL(url!).hostname} (${production ? "PRODUCTION" : "local"}) · ${apply ? "APPLY" : "preview, nothing is changed"}`);
  console.log(`${airline.name}: ${tt.label} (${tt.sourceUrl})`);
  console.log(`Window: ${from} → ${to}${toArg ? "" : " (last stored flight)"}\n`);

  const { flights: wanted, duplicates } = wantedFlights(tt, from, to);
  for (const d of duplicates) console.log(`  ! ${d.pair} ${d.date} ${short(d)}: same number or time as another trip, left out`);

  const airports = new Map((await prisma.airport.findMany()).map((a) => [a.code, a]));
  const routeAirlines = await prisma.routeAirline.findMany({
    where: { airlineId: airline.id },
    include: { route: { include: { origin: true, destination: true } } },
  });
  const raByPair = new Map(routeAirlines.map((ra) => [`${ra.route.origin.code}-${ra.route.destination.code}`, ra]));
  const stored = await prisma.flight.findMany({
    where: { routeAirline: { airlineId: airline.id }, date: { gte: toDate(from), lte: toDate(to) } },
  });
  const pairOfRa = new Map(routeAirlines.map((ra) => [ra.id, `${ra.route.origin.code}-${ra.route.destination.code}`]));

  const pairs = [...new Set([...wanted.map((w) => w.pair), ...stored.map((s) => pairOfRa.get(s.routeAirlineId)!)])].sort();
  const totals = { add: 0, update: 0, confirm: 0, remove: 0, keptCancelled: 0, newRa: 0 };
  const plans: { pair: string; plan: TimetablePlan }[] = [];

  console.log("Pair      add  upd  ok   del  cnx  published");
  for (const pair of pairs) {
    const ra = raByPair.get(pair);
    const mine = stored.filter((s) => s.routeAirlineId === ra?.id).map(toStored);
    const plan = planTimetable(mine, wanted.filter((w) => w.pair === pair));
    const blocked = blockedAdditions(plan);
    if (blocked.length) {
      for (const b of blocked) console.log(`  ! ${pair} ${b.date} ${short(b)}: a cancelled flight holds that number or time; not added`);
      plan.add = plan.add.filter((a) => !blocked.includes(a));
    }
    plans.push({ pair, plan });
    totals.add += plan.add.length;
    totals.update += plan.update.length;
    totals.confirm += plan.confirm.length;
    totals.remove += plan.remove.length;
    totals.keptCancelled += plan.keptCancelled.length;
    if (!ra) totals.newRa++;
    const n = (x: number) => String(x).padEnd(5);
    console.log(
      `${pair.padEnd(10)}${n(plan.add.length)}${n(plan.update.length)}${n(plan.confirm.length)}${n(plan.remove.length)}${n(plan.keptCancelled.length)}` +
        `${ra ? (ra.isPublished ? "yes" : "NO") : "new airline-on-route, unpublished"}${ra && ra.route.status !== "PUBLISHED" ? ` (route ${ra.route.status})` : ""}`,
    );
  }

  // Details, grouped so a weekly change reads as one line: "BU1611 13:45-17:15 → ... on 3 dates".
  const group = (lines: string[]) => {
    const counts = new Map<string, number>();
    for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1);
    return [...counts].map(([l, c]) => `    ${l}${c > 1 ? ` (×${c})` : ""}`);
  };
  for (const { pair, plan } of plans) {
    const lines = [
      ...group(plan.update.map((u) => `~ ${short(u.before)} → ${short(u.after)}`)),
      ...group(plan.remove.map((r) => `- ${short(r)} [${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(`${r.date}T00:00:00Z`).getUTCDay()]}]`)),
      ...group(plan.add.map((a) => `+ ${short(a)} [${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(`${a.date}T00:00:00Z`).getUTCDay()]}]`)),
    ];
    if (lines.length) console.log(`\n  ${pair}\n${lines.join("\n")}`);
  }

  // Flights in the window that someone else wrote (not an earlier timetable load): worth a look before removing.
  const handTyped = stored.filter((s) => s.source === "MANUAL" && s.sourceUrl === null);
  if (handTyped.length) console.log(`\nNote: ${handTyped.length} flights in the window were typed by hand without a source (they are compared like the others).`);

  console.log(
    `\nTotal: +${totals.add} added, ~${totals.update} updated, ${totals.confirm} confirmed, -${totals.remove} removed, ` +
      `${totals.keptCancelled} cancelled kept, ${totals.newRa} new airlines-on-route.`,
  );
  if (!apply) {
    console.log("Preview only. Run again with --apply to write.");
    return;
  }

  const now = new Date();
  const sourceOf = new Map(stored.map((s) => [s.id, s.sourceUrl]));
  for (const { pair, plan } of plans) {
    // Flights already confirmed by this document (a second run) are not confirmed again.
    plan.confirm = plan.confirm.filter((c) => sourceOf.get(c.id) !== tt.sourceUrl);
    const changes = plan.add.length + plan.update.length + plan.confirm.length + plan.remove.length;
    if (changes === 0) continue;
    const [o, d] = pair.split("-");
    await prisma.$transaction(async (tx) => {
      const ra =
        raByPair.get(pair) ??
        (await ensureRouteAirline(tx, { airlineId: airline.id, originId: airports.get(o)!.id, destinationId: airports.get(d)!.id }));
      const parts = [
        plan.add.length && `${plan.add.length} ajoutés`,
        plan.update.length && `${plan.update.length} modifiés`,
        plan.remove.length && `${plan.remove.length} supprimés`,
        plan.confirm.length && `${plan.confirm.length} confirmés`,
      ].filter(Boolean);
      const batch = await tx.changeBatch.create({
        data: {
          actor: ACTOR, routeId: ra.routeId, routeAirlineId: ra.id, action: "APPLY_SCHEDULE",
          summary: `Horaire ${tt.label} appliqué du ${formatDayMonth(toDate(from))} au ${formatDayMonth(toDate(to))} : ${parts.join(", ")}`,
          params: { timetable: name!, sourceUrl: tt.sourceUrl, from, to },
        },
      });
      const log: Prisma.ChangeLogCreateManyInput[] = [];
      const entry = (entityId: string, action: "CREATE" | "UPDATE" | "DELETE", summary: string, changes: object, entity = "Flight") =>
        log.push({ actor: ACTOR, entity, entityId, action, summary, routeId: ra.routeId, batchId: batch.id, changes: JSON.parse(JSON.stringify(changes)) });

      const byId = new Map(stored.map((s) => [s.id, s]));
      // Deletes, then updates, then additions: a number or time freed by one can be reused by another.
      for (const r of plan.remove) {
        const row = byId.get(r.id)!;
        await tx.flight.delete({ where: { id: r.id } });
        entry(r.id, "DELETE", `${label(r)} supprimé (${tt.label})`, row);
      }
      for (const u of plan.update) {
        const before = byId.get(u.id)!;
        const after = await tx.flight.update({ where: { id: u.id }, data: { ...u.after, sourceUrl: tt.sourceUrl, verifiedAt: now } });
        const logged = (f: Flight) => ({ ...pickFields(f), status: f.status, verifiedAt: f.verifiedAt, sourceUrl: f.sourceUrl });
        entry(u.id, "UPDATE", `${label({ flightNumber: u.after.flightNumber, date: u.date })} modifié (${tt.label})`, changedFields(logged(before), logged(after)));
      }
      for (const c of plan.confirm) {
        const before = byId.get(c.id)!;
        await tx.flight.update({ where: { id: c.id }, data: { verifiedAt: now, sourceUrl: tt.sourceUrl } });
        entry(c.id, "UPDATE", `${label({ flightNumber: before.flightNumber, date: c.date })} confirmé (${tt.label})`,
          changedFields({ verifiedAt: before.verifiedAt, sourceUrl: before.sourceUrl }, { verifiedAt: now, sourceUrl: tt.sourceUrl }));
      }
      const rows: Prisma.FlightCreateManyInput[] = plan.add.map(({ pair: _pair, date, ...f }) => ({
        ...f, id: randomUUID(), routeAirlineId: ra.id, date: toDate(date), status: "SCHEDULED",
        source: "AIRLINE_TIMETABLE", sourceUrl: tt.sourceUrl, verifiedAt: now, reviewStatus: "APPROVED", batchId: batch.id,
      }));
      if (rows.length) await tx.flight.createMany({ data: rows });
      for (const row of rows) entry(row.id!, "CREATE", `${label({ flightNumber: row.flightNumber ?? null, date: dayOf(row.date as Date) })} ajouté (${tt.label})`, row);

      // The airline was checked on this route today, against this document.
      if (plan.add.length + plan.update.length + plan.confirm.length > 0) {
        const after = await tx.routeAirline.update({ where: { id: ra.id }, data: { verifiedAt: now, verifiedSourceUrl: tt.sourceUrl } });
        entry(ra.id, "UPDATE", `${tt.airline} vérifiée sur cette route (${tt.label})`,
          changedFields({ verifiedAt: ra.verifiedAt, verifiedSourceUrl: ra.verifiedSourceUrl }, { verifiedAt: after.verifiedAt, verifiedSourceUrl: after.verifiedSourceUrl }), "RouteAirline");
      }
      await tx.changeLog.createMany({ data: log });
    }, TX);
    console.log(`  ✓ ${pair}`);
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
