/**
 * Reference data: airports, airlines, their public status and the priority routes.
 * Idempotent. Run with `npx prisma db seed`.
 *
 * Only fills in what is missing: rows that already exist are left alone, because the back
 * office is where they are edited now (re-running the seed must not undo an edit).
 *
 * Refuses to touch a non-local database unless ALLOW_REMOTE_DB=1, so it can
 * never hit production by accident.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client";
import { ensureRoute, ensureRouteAirline } from "../lib/routes";
import { PRIORITY_ROUTES } from "../lib/priorityRoutes";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host) && process.env.ALLOW_REMOTE_DB !== "1") {
  console.error(`Refusing to seed remote database host "${host}". Set ALLOW_REMOTE_DB=1 to override.`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const KIN = "Africa/Kinshasa";   // UTC+1, west
const LUB = "Africa/Lubumbashi"; // UTC+2, centre and east

type AirportSeed = Omit<Prisma.AirportCreateInput, "id" | "createdAt" | "updatedAt">;

// Domestic network: union of CAA's booking panel, Air Congo's airport list and existing rows.
const airports: AirportSeed[] = [
  { code: "FIH", slug: "kinshasa", city: "Kinshasa", province: "Kinshasa", name: "Aéroport international de N'Djili", timezone: KIN },
  { code: "FBM", slug: "lubumbashi", city: "Lubumbashi", province: "Haut-Katanga", name: "Aéroport international de la Luano", timezone: LUB },
  { code: "FKI", slug: "kisangani", city: "Kisangani", province: "Tshopo", name: "Aéroport international de Bangoka", timezone: LUB },
  { code: "KWZ", slug: "kolwezi", city: "Kolwezi", province: "Lualaba", name: "Aéroport de Kolwezi", timezone: LUB },
  { code: "MJM", slug: "mbuji-mayi", city: "Mbuji-Mayi", province: "Kasaï-Oriental", name: "Aéroport de Mbuji-Mayi", timezone: LUB },
  { code: "KGA", slug: "kananga", city: "Kananga", province: "Kasaï-Central", name: "Aéroport de Kananga", timezone: LUB },
  { code: "KND", slug: "kindu", city: "Kindu", province: "Maniema", name: "Aéroport de Kindu", timezone: LUB },
  { code: "FMI", slug: "kalemie", city: "Kalemie", province: "Tanganyika", name: "Aéroport de Kalemie", timezone: LUB },
  { code: "MDK", slug: "mbandaka", city: "Mbandaka", province: "Équateur", name: "Aéroport de Mbandaka", timezone: KIN },
  { code: "GMA", slug: "gemena", city: "Gemena", province: "Sud-Ubangi", name: "Aéroport de Gemena", timezone: KIN },
  { code: "MNB", slug: "muanda", city: "Muanda", province: "Kongo-Central", name: "Aéroport de Muanda", timezone: KIN },
  { code: "BNC", slug: "beni", city: "Beni", province: "Nord-Kivu", name: "Aéroport de Beni", timezone: LUB },
  { code: "IRP", slug: "isiro", city: "Isiro", province: "Haut-Uele", name: "Aéroport d'Isiro-Matari", timezone: LUB },
  {
    code: "GOM", slug: "goma", city: "Goma", province: "Nord-Kivu", name: "Aéroport international de Goma", timezone: LUB,
    status: "CLOSED",
    statusNote: "Fermé aux vols commerciaux depuis janvier 2025, en raison du conflit armé dans la région.",
    statusSourceUrl: "https://www.journaldekinshasa.com/aeroport-de-goma-le-neuvieme-round-des-discussions-na-rien-debloque/",
  },
  {
    code: "BUX", slug: "bunia", city: "Bunia", province: "Ituri", name: "Aéroport de Bunia", timezone: LUB,
    status: "CLOSED",
    statusNote: "Vols commerciaux suspendus depuis le 6 juin 2026 dans le cadre de la riposte contre l'épidémie d'Ebola.",
    statusSince: new Date("2026-06-06T00:00:00Z"),
    statusSourceUrl: "https://actualite.cd/2026/06/07/ebola-nouvelle-suspension-des-vols-commerciaux-laeroport-de-bunia-5-jours-apres-la",
  },
  // International rows that already exist; corrected but out of domestic scope.
  { code: "EBB", slug: "kampala", city: "Kampala", countryCode: "UG", name: "Entebbe International Airport", timezone: "Africa/Kampala" },
  { code: "KGL", slug: "kigali", city: "Kigali", countryCode: "RW", name: "Kigali International Airport", timezone: "Africa/Kigali" },
];

type AirlineSeed = Omit<Prisma.AirlineCreateInput, "id" | "createdAt" | "updatedAt"> & { previousCode?: string };

const airlines: AirlineSeed[] = [
  {
    previousCode: "CAA", code: "BU", slug: "caa", icao: "DBP", countryCode: "CD",
    name: "Compagnie Africaine d'Aviation (CAA)", website: "https://www.caacongo.com",
  },
  {
    previousCode: "Air Congo", code: "4H", slug: "air-congo", countryCode: "CD",
    name: "Air Congo", website: "https://www.air-congo.com",
    bookingUrl: "https://www.air-congo.com/en/book/book-a-trip/book-a-flight",
  },
  {
    code: "8Z", slug: "congo-airways", countryCode: "CD", name: "Congo Airways",
    website: "https://www.congoairways.com",
    status: "SUSPENDED",
    statusNote: "À l'arrêt depuis avril 2025.",
    statusSourceUrl: "https://acp.cd/province/kasai-central-laccompagnement-du-gouvernement-sollicite-pour-la-reprise-des-activites-dune-compagnie-aerienne/",
  },
  // Existing row with unverified status and placeholder flight numbers: keep, but hide.
  { code: "MG", slug: "mg", name: "Mont Gabaon Airlines", isPublished: false },
];

// Advertised "From USD" fares on air-congo.com (domestic cards, read 2026-10-30).
// The site does not state the origin; Kinshasa (hub) is assumed and must be confirmed in review.
const AIR_CONGO_HOME = "https://www.air-congo.com/en/home";
const airCongoFromFares: { dest: string; amount: number }[] = [
  { dest: "MNB", amount: 160 },
  { dest: "KWZ", amount: 341 },
  { dest: "FMI", amount: 429 },
  { dest: "FKI", amount: 200 },
  { dest: "FBM", amount: 244 },
];

async function main() {
  for (const a of airports) {
    await prisma.airport.upsert({ where: { code: a.code }, create: a, update: {} });
  }

  for (const { previousCode, ...a } of airlines) {
    if (await prisma.airline.findUnique({ where: { code: a.code } })) continue;
    // One-time rename of rows created before IATA codes (e.g. "CAA" → "BU").
    const renamed = previousCode ? await prisma.airline.findUnique({ where: { code: previousCode } }) : null;
    if (renamed) await prisma.airline.update({ where: { id: renamed.id }, data: a });
    else await prisma.airline.create({ data: a });
  }

  // Draft routes with their tier. A tier changed in the back office (anything but the default 3) is kept.
  const airportId = new Map((await prisma.airport.findMany({ select: { id: true, code: true } })).map((a) => [a.code, a.id]));
  const id = (code: string) => {
    const found = airportId.get(code);
    if (!found) throw new Error(`Unknown airport ${code}`);
    return found;
  };
  for (const { tier, pairs } of PRIORITY_ROUTES) {
    for (const [a, b] of pairs) {
      for (const [from, to] of [[a, b], [b, a]]) {
        const route = await ensureRoute(prisma, id(from), id(to));
        if (route.tier === 3 && tier !== 3) await prisma.route.update({ where: { id: route.id }, data: { tier } });
      }
    }
  }

  // Placeholder flights ("XX 291") from the hidden airline must not be shown.
  await prisma.flightPattern.updateMany({ where: { airline: { code: "MG" } }, data: { active: false } });

  const airCongo = await prisma.airline.findUniqueOrThrow({ where: { code: "4H" } });
  const observedAt = new Date("2026-10-30T00:00:00Z");
  for (const f of airCongoFromFares) {
    const routeAirline = await ensureRouteAirline(prisma, { airlineId: airCongo.id, originId: id("FIH"), destinationId: id(f.dest) });
    const exists = await prisma.fareObservation.findFirst({
      where: { routeAirlineId: routeAirline.id, observedAt, sourceUrl: AIR_CONGO_HOME },
    });
    if (exists) continue;
    await prisma.fareObservation.create({
      data: {
        routeAirlineId: routeAirline.id,
        amount: f.amount, currency: "USD", kind: "FROM_PRICE", tripType: "ONE_WAY",
        observedAt, source: "AIRLINE_WEBSITE", sourceUrl: AIR_CONGO_HOME, reviewStatus: "PENDING",
        note: "Prix « From USD » affiché sur la page d'accueil. Origine non précisée (Kinshasa présumée) ; aller simple présumé (les tarifs internationaux sont marqués « Round-trip »).",
      },
    });
  }

  const counts = {
    airports: await prisma.airport.count(),
    airlines: await prisma.airline.count(),
    routes: await prisma.route.count(),
    routesByTier: await prisma.route.groupBy({ by: ["tier"], _count: true, orderBy: { tier: "asc" } }),
    pendingFares: await prisma.fareObservation.count({ where: { reviewStatus: "PENDING" } }),
  };
  console.log("Reference data applied:", counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
