/*
  Warnings:

  - The primary key for the `FlightPattern` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "FlightPattern" DROP CONSTRAINT "FlightPattern_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "FlightPattern_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "FlightPattern_id_seq";
