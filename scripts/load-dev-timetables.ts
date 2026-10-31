/**
 * Local preview data: CAA's and Air Congo's published timetables, typed in by hand.
 * Run after the reference seed: `npm run db:seed && npx tsx scripts/load-dev-timetables.ts`.
 *
 * Local databases only. This is for looking at the site with real routes, not for production:
 * neither PDF gives a validity period, so every week is repeated over the same assumed window
 * (FLIGHTS_*). Writes flights on dates and publishes each airline on its routes, so the local
 * search and the route back office both have data.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma, type Weekday } from "../lib/generated/prisma/client";
import { ensureRouteAirline } from "../lib/routes";
import { arrivalDayOffset, datesOnWeekdays } from "../lib/flights";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`Refusing to load preview timetables into "${host}": local databases only.`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const READ_ON = new Date("2026-10-31T12:00:00Z");  // day the PDFs were read
// Flights: the same assumption over a shorter window, so "known until" has something to show.
const FLIGHTS_FROM = "2026-10-20";
const FLIGHTS_TO = "2026-11-29";

type Leg = { days: Weekday[]; flight: string; from: string; to: string; dep: string; arr: string; aircraft?: string };

// https://www.caacongo.com/horaires-20-oct.pdf ("20/10/2026"). One row per day and leg, as printed.
// The A330 flies 1611-1614; every other rotation is an A320. Monday: "A330 OFF".
// Left out: Kinshasa-Luanda 0021/0022 (Tue, Fri), international, and the PDF does not say which Luanda airport.
const CAA_SOURCE = "https://www.caacongo.com/horaires-20-oct.pdf";
const caaRows: [Weekday, string, string, string, string, string][] = [
  ["MON", "1672", "FBM", "FIH", "09:00", "10:30"],
  ["MON", "1414", "FIH", "MJM", "11:15", "13:55"],
  ["MON", "1414", "MJM", "FBM", "14:40", "16:00"],
  ["MON", "1413", "FBM", "MJM", "16:45", "18:05"],
  ["MON", "1413", "MJM", "FIH", "18:50", "19:30"],
  ["MON", "1633", "FIH", "KWZ", "08:00", "11:00"],
  ["MON", "1633", "KWZ", "FBM", "11:45", "12:30"],
  ["MON", "1634", "FBM", "KWZ", "13:15", "14:00"],
  ["MON", "1634", "KWZ", "FIH", "14:45", "15:45"],
  ["MON", "1671", "FIH", "FBM", "16:30", "20:00"],

  ["TUE", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["TUE", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["TUE", "1161", "FIH", "MDK", "08:00", "09:15"],
  ["TUE", "1162", "MDK", "FIH", "10:00", "11:15"],
  ["TUE", "1433", "FIH", "MJM", "12:00", "14:40"],
  ["TUE", "1433", "MJM", "KWZ", "15:25", "16:40"],
  ["TUE", "1433", "KWZ", "FBM", "17:25", "18:10"],
  ["TUE", "1434", "FBM", "KWZ", "07:30", "08:15"],
  ["TUE", "1434", "KWZ", "MJM", "09:00", "10:15"],
  ["TUE", "1434", "MJM", "FIH", "11:00", "11:40"],
  ["TUE", "1424", "FIH", "KGA", "12:30", "14:55"],
  ["TUE", "1423", "KGA", "FIH", "15:40", "16:05"],

  ["WED", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["WED", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["WED", "1633", "FBM", "KWZ", "08:00", "08:45"],
  ["WED", "1633", "KWZ", "FIH", "09:30", "10:30"],
  ["WED", "1257", "FIH", "KND", "11:15", "14:15"],
  ["WED", "1647", "KND", "FMI", "15:00", "16:30"],
  ["WED", "1638", "FMI", "FBM", "17:15", "18:45"],
  ["WED", "1641", "FIH", "FKI", "08:00", "11:00"],
  ["WED", "1642", "FKI", "FIH", "11:45", "12:45"],
  ["WED", "1634", "FIH", "KWZ", "13:30", "16:30"],
  ["WED", "1634", "KWZ", "FBM", "17:15", "18:00"],

  ["THU", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["THU", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["THU", "1434", "FBM", "KWZ", "07:30", "08:15"],
  ["THU", "1434", "KWZ", "MJM", "09:00", "10:15"],
  ["THU", "1434", "MJM", "FIH", "11:00", "11:40"],
  ["THU", "1433", "FIH", "MJM", "12:25", "15:10"],
  ["THU", "1433", "MJM", "KWZ", "15:55", "17:10"],
  ["THU", "1433", "KWZ", "FBM", "18:00", "18:45"],
  ["THU", "1631", "FBM", "FMI", "08:00", "09:30"],
  ["THU", "1648", "FMI", "KND", "10:15", "11:45"],
  ["THU", "1258", "KND", "FIH", "12:30", "13:30"],
  ["THU", "1161", "FIH", "MDK", "14:15", "15:30"],
  ["THU", "1162", "MDK", "FIH", "16:15", "17:15"],

  ["FRI", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["FRI", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["FRI", "1633", "FBM", "KWZ", "09:00", "09:45"],
  ["FRI", "1633", "KWZ", "FIH", "10:30", "11:30"],
  ["FRI", "1424", "FIH", "KGA", "08:00", "10:25"],
  ["FRI", "1423", "KGA", "FIH", "11:10", "11:35"],
  ["FRI", "1634", "FIH", "KWZ", "12:30", "15:30"],
  ["FRI", "1634", "KWZ", "FBM", "16:15", "17:45"],

  ["SAT", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["SAT", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["SAT", "1161", "FIH", "MDK", "08:00", "09:15"],
  ["SAT", "1162", "MDK", "FIH", "10:00", "11:15"],
  ["SAT", "1414", "FIH", "MJM", "12:00", "14:40"],
  ["SAT", "1414", "MJM", "FBM", "15:25", "16:45"],
  ["SAT", "1413", "FBM", "MJM", "17:30", "18:50"],
  ["SAT", "1413", "MJM", "FIH", "19:35", "20:15"],
  ["SAT", "1631", "FBM", "FMI", "08:00", "09:30"],
  ["SAT", "1648", "FMI", "KND", "10:15", "11:45"],
  ["SAT", "1258", "KND", "FIH", "12:30", "13:30"],
  ["SAT", "1641", "FIH", "FKI", "14:15", "17:15"],
  ["SAT", "1642", "FKI", "FIH", "18:00", "19:00"],

  ["SUN", "1612", "FBM", "FIH", "08:00", "09:30"],
  ["SUN", "1611", "FIH", "FBM", "10:55", "14:25"],
  ["SUN", "1614", "FBM", "FIH", "15:45", "17:15"],
  ["SUN", "1613", "FIH", "FBM", "18:30", "22:00"],
  ["SUN", "1256", "FIH", "FKI", "09:00", "12:00"],
  ["SUN", "1256", "FKI", "KND", "12:45", "13:45"],
  ["SUN", "1255", "KND", "FKI", "14:30", "15:30"],
  ["SUN", "1255", "FKI", "FIH", "16:15", "17:15"],
  ["SUN", "1257", "FIH", "KND", "08:00", "11:00"],
  ["SUN", "1647", "KND", "FMI", "11:45", "13:15"],
  ["SUN", "1638", "FMI", "FBM", "14:00", "15:30"],
];
const A330 = new Set(["1611", "1612", "1613", "1614"]);
const caaLegs: Leg[] = caaRows.map(([day, n, from, to, dep, arr]) => ({
  days: [day], flight: `BU${n}`, from, to, dep, arr, aircraft: A330.has(n) ? "Airbus A330" : "Airbus A320",
}));

// https://www.air-congo.com/docs/default-source/default-document-library/horaire-des-vols.pdf
// No flight numbers and no dates are published. Two rows are left out because their times are
// impossible as printed: Lubumbashi-Kinshasa "12:10 - 11:30" and Kinshasa-Lubumbashi "15:00 - 11:30".
const AIR_CONGO_SOURCE =
  "https://www.air-congo.com/docs/default-source/default-document-library/horaire-des-vols.pdf";
const EVERY_DAY: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const airCongoLegs: Leg[] = [
  { days: EVERY_DAY, from: "FIH", to: "FBM", dep: "08:00", arr: "11:30" },
  { days: EVERY_DAY, from: "FBM", to: "FIH", dep: "19:10", arr: "20:40" },
  { days: ["MON", "WED"], from: "FIH", to: "MJM", dep: "08:00", arr: "10:40" },
  { days: ["MON", "WED"], from: "MJM", to: "FBM", dep: "11:20", arr: "12:50" },
  { days: ["MON", "WED"], from: "FBM", to: "MJM", dep: "13:30", arr: "15:00" },
  { days: ["MON", "WED"], from: "MJM", to: "FIH", dep: "15:40", arr: "16:20" },
  { days: ["SUN"], from: "FIH", to: "FKI", dep: "08:00", arr: "11:00" },
  { days: ["SUN"], from: "FKI", to: "KND", dep: "11:45", arr: "12:45" },
  { days: ["SUN"], from: "KND", to: "FIH", dep: "13:20", arr: "14:20" },
  { days: ["FRI"], from: "FIH", to: "KND", dep: "08:00", arr: "11:00" },
  { days: ["FRI"], from: "KND", to: "FKI", dep: "11:40", arr: "12:45" },
  { days: ["FRI"], from: "FKI", to: "FIH", dep: "13:20", arr: "14:20" },
  { days: ["TUE", "SAT"], from: "FIH", to: "GMA", dep: "08:00", arr: "09:50" },
  { days: ["TUE", "SAT"], from: "GMA", to: "FIH", dep: "10:30", arr: "12:20" },
  { days: ["THU"], from: "FIH", to: "KGA", dep: "08:00", arr: "10:30" },
  { days: ["THU"], from: "KGA", to: "FMI", dep: "11:00", arr: "12:30" },
  { days: ["THU"], from: "FMI", to: "KGA", dep: "13:20", arr: "14:50" },
  { days: ["THU"], from: "KGA", to: "FIH", dep: "15:30", arr: "16:00" },
  { days: ["TUE", "SAT"], from: "FIH", to: "MDK", dep: "13:30", arr: "14:50" },
  { days: ["TUE", "SAT"], from: "MDK", to: "FIH", dep: "15:30", arr: "16:50" },
].map((leg) => ({ ...leg, days: leg.days as Weekday[], flight: "" })); // no flight numbers published

type Trip = { day: Weekday; flight: string | null; from: string; to: string; dep: string; arr: string; via: string[]; aircraft?: string };

/**
 * Every trip a day's legs offer. The legs of one flight number that follow each other
 * (BU1414 FIH→MJM, then MJM→FBM) also make the through trips (FIH→FBM via MJM), the way
 * ROUTE-MODEL §5.3 stores them. Unnumbered legs (Air Congo) stay single: nothing says they connect.
 */
function trips(legs: Leg[]): Trip[] {
  const out: Trip[] = [];
  const byFlight = new Map<string, Leg[]>();
  for (const leg of legs) {
    for (const day of leg.days) {
      if (!leg.flight) {
        out.push({ day, flight: null, from: leg.from, to: leg.to, dep: leg.dep, arr: leg.arr, via: [], aircraft: leg.aircraft });
        continue;
      }
      const key = `${day}|${leg.flight}`;
      byFlight.set(key, [...(byFlight.get(key) ?? []), leg]);
    }
  }
  for (const [key, group] of byFlight) {
    const day = key.split("|")[0] as Weekday;
    group.sort((a, b) => a.dep.localeCompare(b.dep));
    for (let i = 0; i < group.length; i++) {
      for (let j = i; j < group.length; j++) {
        const follows = j === i || (group[j - 1].to === group[j].from && group[j].dep >= group[j - 1].arr);
        if (!follows) break;
        if (group[i].from === group[j].to) continue;
        out.push({
          day, flight: group[i].flight, from: group[i].from, to: group[j].to, dep: group[i].dep, arr: group[j].arr,
          via: group.slice(i + 1, j + 1).map((leg) => leg.from), aircraft: group[i].aircraft,
        });
      }
    }
  }
  return out;
}

async function loadFlights(airlineCode: string, legs: Leg[], sourceUrl: string) {
  const airline = await prisma.airline.findUniqueOrThrow({ where: { code: airlineCode } });
  const airports = new Map((await prisma.airport.findMany()).map((a) => [a.code, a]));
  // Only rows this script wrote: same airline and source.
  const removed = await prisma.flight.deleteMany({ where: { sourceUrl, routeAirline: { airlineId: airline.id } } });

  const routeAirlineIds = new Map<string, string>();
  const rows: Prisma.FlightCreateManyInput[] = [];
  const taken = new Set<string>();
  let skipped = 0;
  const all = trips(legs);
  for (const trip of all) {
    const origin = airports.get(trip.from);
    const destination = airports.get(trip.to);
    if (!origin || !destination) throw new Error(`Unknown airport in ${trip.from}-${trip.to}: run the seed first`);
    const pairKey = `${trip.from}-${trip.to}`;
    let routeAirlineId = routeAirlineIds.get(pairKey);
    if (!routeAirlineId) {
      const routeAirline = await ensureRouteAirline(prisma, { airlineId: airline.id, originId: origin.id, destinationId: destination.id });
      // Published so the local search shows them; in production the operator publishes by hand.
      await prisma.routeAirline.update({ where: { id: routeAirline.id }, data: { verifiedAt: READ_ON, verifiedSourceUrl: sourceUrl, isPublished: true } });
      routeAirlineId = routeAirline.id;
      routeAirlineIds.set(pairKey, routeAirlineId);
    }
    for (const date of datesOnWeekdays(FLIGHTS_FROM, FLIGHTS_TO, [trip.day])) {
      // The two unique keys of Flight: one departure per time, one per flight number.
      const keys = [`${routeAirlineId}|${date}|${trip.dep}`, trip.flight && `${routeAirlineId}|${date}|${trip.flight}`].filter(Boolean) as string[];
      if (keys.some((k) => taken.has(k))) {
        skipped++;
        continue;
      }
      keys.forEach((k) => taken.add(k));
      rows.push({
        routeAirlineId, date: new Date(`${date}T00:00:00Z`), flightNumber: trip.flight,
        departureTime: trip.dep, arrivalTime: trip.arr, arrivalDayOffset: arrivalDayOffset(trip.dep, trip.arr),
        via: trip.via, aircraft: trip.aircraft,
        source: "AIRLINE_TIMETABLE", sourceUrl, verifiedAt: READ_ON, reviewStatus: "APPROVED",
      });
    }
  }
  await prisma.flight.createMany({ data: rows });
  const withStops = all.filter((t) => t.via.length > 0).length;
  console.log(
    `${airline.name}: ${rows.length} flights on ${routeAirlineIds.size} routes, ${FLIGHTS_FROM} to ${FLIGHTS_TO} ` +
      `(${all.length} weekly trips, ${withStops} with stops; ${skipped} duplicates skipped; replaced ${removed.count})`,
  );
}

async function main() {
  // Schedules written by earlier versions of this script; the site reads dated flights now.
  const old = await prisma.flightPattern.deleteMany({ where: { sourceUrl: { in: [CAA_SOURCE, AIR_CONGO_SOURCE] } } });
  if (old.count) console.log(`Deleted ${old.count} old preview schedules`);
  await loadFlights("BU", caaLegs, CAA_SOURCE);
  await loadFlights("4H", airCongoLegs, AIR_CONGO_SOURCE);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
