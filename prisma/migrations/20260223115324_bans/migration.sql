/*
  Warnings:

  - You are about to drop the `UserBan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `expiresAt` on the `IpBan` table. All the data in the column will be lost.
  - You are about to drop the column `revokedById` on the `IpBan` table. All the data in the column will be lost.
  - Made the column `createdById` on table `IpBan` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "UserBan_revokedAt_idx";

-- DropIndex
DROP INDEX "UserBan_expiresAt_idx";

-- DropIndex
DROP INDEX "UserBan_userId_createdAt_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserBan";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AccountBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "bannedUntil" DATETIME,
    "revokedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IpBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "bannedUntil" DATETIME,
    "revokedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IpBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_IpBan" ("createdAt", "createdById", "id", "ip", "reason", "revokedAt", "updatedAt") SELECT "createdAt", "createdById", "id", "ip", "reason", "revokedAt", "updatedAt" FROM "IpBan";
DROP TABLE "IpBan";
ALTER TABLE "new_IpBan" RENAME TO "IpBan";
CREATE INDEX "IpBan_ip_revokedAt_bannedUntil_idx" ON "IpBan"("ip", "revokedAt", "bannedUntil");
CREATE INDEX "IpBan_createdById_createdAt_idx" ON "IpBan"("createdById", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AccountBan_userId_revokedAt_bannedUntil_idx" ON "AccountBan"("userId", "revokedAt", "bannedUntil");

-- CreateIndex
CREATE INDEX "AccountBan_createdById_createdAt_idx" ON "AccountBan"("createdById", "createdAt");
