-- CreateEnum
CREATE TYPE "ContactTopic" AS ENUM ('QUESTION', 'CORRECTION', 'AIRLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'ANSWERED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "topic" "ContactTopic" NOT NULL,
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
