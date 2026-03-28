-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('GENERAL', 'VIP', 'EARLY_BIRD');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('CONFIRMED', 'WAITLISTED', 'OFFERED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalCapacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'GENERAL',
    "status" "RsvpStatus" NOT NULL DEFAULT 'CONFIRMED',
    "waitlistPosition" INTEGER,
    "offerExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rsvps_eventId_status_idx" ON "rsvps"("eventId", "status");

-- CreateIndex
CREATE INDEX "rsvps_eventId_status_createdAt_idx" ON "rsvps"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "rsvps_status_offerExpiresAt_idx" ON "rsvps"("status", "offerExpiresAt");

-- AddForeignKey
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
