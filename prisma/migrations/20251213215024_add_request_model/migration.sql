/*
  Warnings:

  - You are about to drop the column `country` on the `Airline` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Airport` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'CLAIMED', 'CONTACTED', 'CLOSED');

-- AlterTable
ALTER TABLE "Airline" DROP COLUMN "country",
ADD COLUMN     "countryCode" TEXT;

-- AlterTable
ALTER TABLE "Airport" DROP COLUMN "country",
ADD COLUMN     "countryCode" TEXT NOT NULL DEFAULT 'CD';

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "prefersWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "flightNumber" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "travelDate" TIMESTAMP(3) NOT NULL,
    "travelClass" TEXT NOT NULL,
    "travelers" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);
