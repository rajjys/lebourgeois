/*
  Warnings:

  - Added the required column `timezone` to the `Airport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Airport" ADD COLUMN     "timezone" TEXT NOT NULL;
