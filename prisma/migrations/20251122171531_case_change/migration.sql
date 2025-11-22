/*
  Warnings:

  - You are about to drop the column `distanceinKm` on the `FlightPattern` table. All the data in the column will be lost.
  - You are about to drop the column `durationMin` on the `FlightPattern` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FlightPattern" DROP COLUMN "distanceinKm",
DROP COLUMN "durationMin",
ADD COLUMN     "distanceInKm" INTEGER,
ADD COLUMN     "durationInMin" INTEGER;
