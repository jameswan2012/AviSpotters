-- CreateTable
CREATE TABLE "CustomLeaderboard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "titleJson" TEXT NOT NULL,
    "descJson" TEXT,
    "metric" TEXT NOT NULL DEFAULT 'approved_count',
    "rangeKey" TEXT NOT NULL DEFAULT 'all',
    "rangeStart" DATETIME,
    "rangeEnd" DATETIME,
    "participantsJson" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomLeaderboard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomLeaderboard_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomLeaderboard_enabled_createdAt_idx" ON "CustomLeaderboard"("enabled", "createdAt");

-- CreateIndex
CREATE INDEX "CustomLeaderboard_rangeKey_createdAt_idx" ON "CustomLeaderboard"("rangeKey", "createdAt");

-- CreateIndex
CREATE INDEX "CustomLeaderboard_createdById_createdAt_idx" ON "CustomLeaderboard"("createdById", "createdAt");
