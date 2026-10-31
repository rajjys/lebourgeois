/**
 * Routes and airline-on-route records (docs/ROUTE-MODEL.md §4).
 * Takes the client as a parameter so API routes, transactions, the seed and scripts share it.
 * Relative imports: the seed and scripts run under tsx outside Next.
 */
import type { Prisma, PrismaClient } from "./generated/prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** "kinshasa" + "lubumbashi" → "kinshasa-lubumbashi". Same rule as the SQL backfills. */
export const routeSlug = (originSlug: string, destinationSlug: string) => `${originSlug}-${destinationSlug}`;

/** The route for a city pair, created as a draft when it does not exist yet. */
export async function ensureRoute(db: Db, originId: string, destinationId: string) {
  if (originId === destinationId) throw new Error("A route needs two different airports");
  const existing = await db.route.findUnique({ where: { originId_destinationId: { originId, destinationId } } });
  if (existing) return existing;
  const [origin, destination] = await Promise.all([
    db.airport.findUniqueOrThrow({ where: { id: originId }, select: { slug: true } }),
    db.airport.findUniqueOrThrow({ where: { id: destinationId }, select: { slug: true } }),
  ]);
  return db.route.upsert({
    where: { originId_destinationId: { originId, destinationId } },
    create: { originId, destinationId, slug: routeSlug(origin.slug, destination.slug) },
    update: {},
  });
}

/** The airline's record on a city pair, created (unpublished) with its route when missing. */
export async function ensureRouteAirline(db: Db, pair: { airlineId: string; originId: string; destinationId: string }) {
  const route = await ensureRoute(db, pair.originId, pair.destinationId);
  return db.routeAirline.upsert({
    where: { routeId_airlineId: { routeId: route.id, airlineId: pair.airlineId } },
    create: { routeId: route.id, airlineId: pair.airlineId },
    update: {},
  });
}

/** Airport code from a free-text city ("Beni (BNC) · Aéroport de Beni" → "BNC"). */
export const codeInText = (text: string) => text.match(/\(([A-Z]{3})\)/)?.[1];

/**
 * The route a request is about, when both free-text cities match an airport (by the code in
 * brackets, else by city name) and that route exists. Same rule as the schema v3 backfill.
 */
export async function routeIdForCities(db: Db, originCity: string, destinationCity: string) {
  const find = async (text: string) => {
    const code = codeInText(text);
    if (code) {
      const byCode = await db.airport.findUnique({ where: { code }, select: { id: true } });
      if (byCode) return byCode.id;
    }
    const byCity = await db.airport.findFirst({
      where: { city: { equals: text.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    return byCity?.id;
  };
  const [originId, destinationId] = await Promise.all([find(originCity), find(destinationCity)]);
  if (!originId || !destinationId) return null;
  const route = await db.route.findUnique({
    where: { originId_destinationId: { originId, destinationId } },
    select: { id: true },
  });
  return route?.id ?? null;
}
