-- CreateEnum
CREATE TYPE "AirportStatus" AS ENUM ('OPEN', 'RESTRICTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AirlineStatus" AS ENUM ('OPERATING', 'SUSPENDED', 'CEASED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUAL', 'AIRLINE_TIMETABLE', 'AIRLINE_WEBSITE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FareKind" AS ENUM ('FROM_PRICE', 'QUOTE');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('ONE_WAY', 'ROUND_TRIP');

-- AlterTable
ALTER TABLE "Airline" ADD COLUMN     "bookingUrl" TEXT,
ADD COLUMN     "icao" TEXT,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" "AirlineStatus" NOT NULL DEFAULT 'OPERATING',
ADD COLUMN     "statusNote" TEXT,
ADD COLUMN     "statusSince" TIMESTAMP(3),
ADD COLUMN     "statusSourceUrl" TEXT;

-- AlterTable
ALTER TABLE "Airport" ADD COLUMN     "province" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" "AirportStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "statusNote" TEXT,
ADD COLUMN     "statusSince" TIMESTAMP(3),
ADD COLUMN     "statusSourceUrl" TEXT;

-- AlterTable
ALTER TABLE "FlightPattern" ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- Backfill slugs for existing rows: lowercase, strip French accents, non-alphanumerics -> "-".
-- Airports sharing a city get "-<iata>" appended so slugs stay unique.
UPDATE "Airport" a SET "slug" = s.slug
FROM (
  SELECT id,
         base || CASE WHEN count(*) OVER (PARTITION BY base) > 1 THEN '-' || lower(code) ELSE '' END AS slug
  FROM (
    SELECT id, code,
           trim(both '-' from regexp_replace(translate(lower(city), 'àâäáéèêëíîïóôöúùûüç', 'aaaaeeeeiiiooouuuuc'), '[^a-z0-9]+', '-', 'g')) AS base
    FROM "Airport"
  ) x
) s
WHERE a.id = s.id;

UPDATE "Airline"
SET "slug" = trim(both '-' from regexp_replace(translate(lower(code), 'àâäáéèêëíîïóôöúùûüç', 'aaaaeeeeiiiooouuuuc'), '[^a-z0-9]+', '-', 'g'));

ALTER TABLE "Airport" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Airline" ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareObservation" (
    "id" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "kind" "FareKind" NOT NULL,
    "tripType" "TripType" NOT NULL DEFAULT 'ONE_WAY',
    "cabin" TEXT,
    "travelDate" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL,
    "source" "DataSource" NOT NULL,
    "sourceUrl" TEXT,
    "note" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FareObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Route_slug_key" ON "Route"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Route_originId_destinationId_key" ON "Route"("originId", "destinationId");

-- CreateIndex
CREATE INDEX "FareObservation_originId_destinationId_observedAt_idx" ON "FareObservation"("originId", "destinationId", "observedAt");

-- CreateIndex
CREATE INDEX "FareObservation_reviewStatus_idx" ON "FareObservation"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_slug_key" ON "Airline"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_slug_key" ON "Airport"("slug");

-- CreateIndex
CREATE INDEX "FlightPattern_originId_destinationId_idx" ON "FlightPattern"("originId", "destinationId");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareObservation" ADD CONSTRAINT "FareObservation_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareObservation" ADD CONSTRAINT "FareObservation_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareObservation" ADD CONSTRAINT "FareObservation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill one Route per existing city pair (unpublished until verified).
INSERT INTO "Route" ("id", "originId", "destinationId", "slug", "isPublished", "updatedAt")
SELECT gen_random_uuid()::text, p."originId", p."destinationId", o."slug" || '-' || d."slug", false, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "originId", "destinationId" FROM "FlightPattern") p
JOIN "Airport" o ON o.id = p."originId"
JOIN "Airport" d ON d.id = p."destinationId"
ON CONFLICT DO NOTHING;

-- Copy legacy per-pattern prices into fare history. PENDING: they are old and
-- partly attached to placeholder flight numbers, so a human decides.
INSERT INTO "FareObservation" ("id", "airlineId", "originId", "destinationId", "amount", "currency", "kind", "tripType", "observedAt", "source", "note", "reviewStatus", "updatedAt")
SELECT gen_random_uuid()::text, "airlineId", "originId", "destinationId", "price"::numeric(10,2), COALESCE("currency", 'USD'),
       'FROM_PRICE', 'ONE_WAY', "updatedAt", 'MANUAL',
       'Migré depuis FlightPattern.price (vol ' || "flightNumber" || ')', 'PENDING', CURRENT_TIMESTAMP
FROM "FlightPattern"
WHERE "price" IS NOT NULL;
