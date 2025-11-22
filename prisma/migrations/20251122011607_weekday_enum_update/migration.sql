/*
  Warnings:

  - The `daysOfWeek` column on the `FlightPattern` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- AlterTable
ALTER TABLE "FlightPattern" DROP COLUMN "daysOfWeek",
ADD COLUMN     "daysOfWeek" "Weekday"[];
