-- First-party visit statistics and request attribution (AN-1, docs/ANALYTICS.md), and a "booked"
-- outcome for requests (AN-3). Existing requests keep null attribution: shown as "non mesurée".

-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'BOOKED';

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "attribution" JSONB,
ADD COLUMN     "device" TEXT,
ADD COLUMN     "firstChannel" TEXT,
ADD COLUMN     "lastChannel" TEXT,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "visitorId" TEXT;

-- CreateTable
CREATE TABLE "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "isNewVisitor" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hostname" TEXT NOT NULL,
    "landingPath" TEXT NOT NULL,
    "referrerHost" TEXT,
    "channel" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "device" TEXT NOT NULL,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "routeSlug" TEXT,
    "airline" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "travelDate" TEXT,
    "passengers" INTEGER,
    "props" JSONB,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSession_startedAt_idx" ON "AnalyticsSession"("startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_visitorId_idx" ON "AnalyticsSession"("visitorId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_occurredAt_idx" ON "AnalyticsEvent"("name", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_routeSlug_occurredAt_idx" ON "AnalyticsEvent"("routeSlug", "occurredAt");

-- CreateIndex
CREATE INDEX "Request_createdAt_idx" ON "Request"("createdAt");
