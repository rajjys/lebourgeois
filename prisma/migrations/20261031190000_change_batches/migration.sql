-- Workspace actions that can be undone as a whole (RW-3). New table only; no existing data changes.
-- CreateEnum
CREATE TYPE "BatchAction" AS ENUM ('APPLY_SCHEDULE', 'COPY_WEEK', 'CANCEL_FLIGHTS', 'EDIT_DAY', 'VERIFY', 'UNDO');

-- CreateTable
CREATE TABLE "ChangeBatch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "routeAirlineId" TEXT NOT NULL,
    "action" "BatchAction" NOT NULL,
    "summary" TEXT NOT NULL,
    "params" JSONB,
    "undoneAt" TIMESTAMP(3),
    "undoneBy" TEXT,

    CONSTRAINT "ChangeBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeBatch_routeAirlineId_createdAt_idx" ON "ChangeBatch"("routeAirlineId", "createdAt");

