-- Schema v3: route-centric model (docs/ROUTE-MODEL.md §4 and §9).
-- Order matters: new tables first, then existing rows are attached to them, then the old columns go.
-- No flights are created from FlightPattern rows: the patterns stay read-only as "last known schedule".

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RouteAirlineStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ENDED');

-- CreateEnum
CREATE TYPE "FlightStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChangeAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- Route: status replaces isPublished; tier and editorial note.
ALTER TABLE "Route" ADD COLUMN     "note" TEXT,
ADD COLUMN     "status" "RouteStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 3;

UPDATE "Route" SET "status" = 'PUBLISHED' WHERE "isPublished";

ALTER TABLE "Route" DROP COLUMN "isPublished";

-- Not expressible in the Prisma schema; Prisma Migrate leaves CHECK constraints alone.
ALTER TABLE "Route" ADD CONSTRAINT "Route_tier_check" CHECK ("tier" BETWEEN 1 AND 3);
ALTER TABLE "Route" ADD CONSTRAINT "Route_distinct_airports_check" CHECK ("originId" <> "destinationId");

-- CreateTable
CREATE TABLE "RouteAirline" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "status" "RouteAirlineStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "bookingUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedSourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteAirline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouteAirline_airlineId_idx" ON "RouteAirline"("airlineId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteAirline_routeId_airlineId_key" ON "RouteAirline"("routeId", "airlineId");

-- AddForeignKey
ALTER TABLE "RouteAirline" ADD CONSTRAINT "RouteAirline_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAirline" ADD CONSTRAINT "RouteAirline_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: a draft route for every city pair a schedule or a fare mentions (e.g. Kinshasa → Muanda from a fare).
INSERT INTO "Route" ("id", "originId", "destinationId", "slug", "updatedAt")
SELECT gen_random_uuid()::text, p."originId", p."destinationId", o."slug" || '-' || d."slug", CURRENT_TIMESTAMP
FROM (
  SELECT "originId", "destinationId" FROM "FlightPattern"
  UNION
  SELECT "originId", "destinationId" FROM "FareObservation"
) p
JOIN "Airport" o ON o.id = p."originId"
JOIN "Airport" d ON d.id = p."destinationId"
WHERE p."originId" <> p."destinationId"
ON CONFLICT DO NOTHING;

-- Backfill: one unpublished airline-on-route for every route and airline pair found.
INSERT INTO "RouteAirline" ("id", "routeId", "airlineId", "updatedAt")
SELECT gen_random_uuid()::text, r.id, p."airlineId", CURRENT_TIMESTAMP
FROM (
  SELECT "airlineId", "originId", "destinationId" FROM "FlightPattern"
  UNION
  SELECT "airlineId", "originId", "destinationId" FROM "FareObservation"
) p
JOIN "Route" r ON r."originId" = p."originId" AND r."destinationId" = p."destinationId"
ON CONFLICT DO NOTHING;

-- FareObservation: attach to its airline-on-route, then drop the columns that duplicated it.
ALTER TABLE "FareObservation" ADD COLUMN     "fareName" TEXT,
ADD COLUMN     "flightNumber" TEXT,
ADD COLUMN     "routeAirlineId" TEXT;

UPDATE "FareObservation" f SET "routeAirlineId" = ra.id
FROM "Route" r
JOIN "RouteAirline" ra ON ra."routeId" = r.id
WHERE r."originId" = f."originId" AND r."destinationId" = f."destinationId" AND ra."airlineId" = f."airlineId";

-- Fails the whole migration (nothing applied) if any fare could not be attached.
ALTER TABLE "FareObservation" ALTER COLUMN "routeAirlineId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "FareObservation" DROP CONSTRAINT "FareObservation_airlineId_fkey";

-- DropForeignKey
ALTER TABLE "FareObservation" DROP CONSTRAINT "FareObservation_originId_fkey";

-- DropForeignKey
ALTER TABLE "FareObservation" DROP CONSTRAINT "FareObservation_destinationId_fkey";

-- DropIndex
DROP INDEX "FareObservation_originId_destinationId_observedAt_idx";

ALTER TABLE "FareObservation" DROP COLUMN "airlineId",
DROP COLUMN "destinationId",
DROP COLUMN "originId";

-- CreateIndex
CREATE INDEX "FareObservation_routeAirlineId_observedAt_idx" ON "FareObservation"("routeAirlineId", "observedAt");

-- AddForeignKey
ALTER TABLE "FareObservation" ADD CONSTRAINT "FareObservation_routeAirlineId_fkey" FOREIGN KEY ("routeAirlineId") REFERENCES "RouteAirline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Request: link to a route when both free-text cities match an airport ("Beni (BNC) · …" or "Beni")
-- and that route exists. Unmatched requests stay unlinked.
ALTER TABLE "Request" ADD COLUMN     "routeId" TEXT;

WITH matched AS (
  SELECT q.id,
    (SELECT a.id FROM "Airport" a
      WHERE a.code = substring(q."originCity" from '\(([A-Z]{3})\)') OR lower(a.city) = lower(trim(q."originCity"))
      ORDER BY (a.code = substring(q."originCity" from '\(([A-Z]{3})\)')) DESC NULLS LAST LIMIT 1) AS origin_id,
    (SELECT a.id FROM "Airport" a
      WHERE a.code = substring(q."destinationCity" from '\(([A-Z]{3})\)') OR lower(a.city) = lower(trim(q."destinationCity"))
      ORDER BY (a.code = substring(q."destinationCity" from '\(([A-Z]{3})\)')) DESC NULLS LAST LIMIT 1) AS destination_id
  FROM "Request" q
)
UPDATE "Request" q SET "routeId" = r.id
FROM matched m
JOIN "Route" r ON r."originId" = m.origin_id AND r."destinationId" = m.destination_id
WHERE q.id = m.id;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "routeAirlineId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "flightNumber" TEXT,
    "departureTime" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "arrivalDayOffset" INTEGER NOT NULL DEFAULT 0,
    "via" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aircraft" TEXT,
    "status" "FlightStatus" NOT NULL DEFAULT 'SCHEDULED',
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Flight_date_idx" ON "Flight"("date");

-- CreateIndex
CREATE INDEX "Flight_batchId_idx" ON "Flight"("batchId");

-- CreateIndex: a flight number departs once a day per route (NULL numbers are exempt, so unnumbered
-- flights fall back on the next index: one departure per time).
CREATE UNIQUE INDEX "Flight_routeAirlineId_date_flightNumber_key" ON "Flight"("routeAirlineId", "date", "flightNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_routeAirlineId_date_departureTime_key" ON "Flight"("routeAirlineId", "date", "departureTime");

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_routeAirlineId_fkey" FOREIGN KEY ("routeAirlineId") REFERENCES "RouteAirline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Local times "HH:MM", same-day or next-day arrival, flight numbers as written without spaces, stops as airport codes.
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_times_check"
  CHECK ("departureTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "arrivalTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_arrival_day_offset_check" CHECK ("arrivalDayOffset" IN (0, 1));
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_flight_number_check"
  CHECK ("flightNumber" IS NULL OR "flightNumber" ~ '^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$');
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_via_check"
  CHECK ("via" IS NOT NULL AND array_to_string("via", ',') ~ '^([A-Z]{3}(,[A-Z]{3})*)?$');

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "ChangeAction" NOT NULL,
    "routeId" TEXT,
    "batchId" TEXT,
    "summary" TEXT NOT NULL,
    "changes" JSONB,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeLog_entity_entityId_createdAt_idx" ON "ChangeLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeLog_routeId_createdAt_idx" ON "ChangeLog"("routeId", "createdAt");
