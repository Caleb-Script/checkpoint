/*
  Warnings:

  - You are about to drop the `ScanLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShareGuard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."Channel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."DeliveryStatus" AS ENUM ('NEW', 'SENT', 'DELIVERED', 'READ', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "public"."ScanLog" DROP CONSTRAINT "ScanLog_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ShareGuard" DROP CONSTRAINT "ShareGuard_ticketId_fkey";

-- DropTable
DROP TABLE "public"."ScanLog";

-- DropTable
DROP TABLE "public"."ShareGuard";

-- DropTable
DROP TABLE "public"."Ticket";

-- DropEnum
DROP TYPE "public"."PresenceState";

-- CreateTable
CREATE TABLE "public"."Template" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "locale" TEXT,
    "channel" "public"."Channel" NOT NULL DEFAULT 'IN_APP',
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "recipientUsername" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientTenant" TEXT,
    "templateId" TEXT,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "renderedTitle" TEXT NOT NULL,
    "renderedBody" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "linkUrl" TEXT,
    "priority" "public"."Priority" NOT NULL DEFAULT 'NORMAL',
    "category" TEXT,
    "status" "public"."DeliveryStatus" NOT NULL DEFAULT 'NEW',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_key_key" ON "public"."Template"("key");

-- CreateIndex
CREATE INDEX "Notification_recipientUsername_read_createdAt_idx" ON "public"."Notification"("recipientUsername", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUsername_status_createdAt_idx" ON "public"."Notification"("recipientUsername", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_templateId_idx" ON "public"."Notification"("templateId");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "public"."Notification"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
