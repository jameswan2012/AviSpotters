-- AlterTable
ALTER TABLE "News" ADD COLUMN "imageMime" TEXT;
ALTER TABLE "News" ADD COLUMN "imagePath" TEXT;
ALTER TABLE "News" ADD COLUMN "imageSizeBytes" INTEGER;
ALTER TABLE "News" ADD COLUMN "imageUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "createdIp" TEXT;
ALTER TABLE "User" ADD COLUMN "createdUserAgent" TEXT;

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "staffReply" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_email_createdAt_idx" ON "Ticket"("email", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_resolvedById_createdAt_idx" ON "Ticket"("resolvedById", "createdAt");
