-- CreateTable
CREATE TABLE "UserBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IpBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IpBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rejectStreak" INTEGER NOT NULL DEFAULT 0,
    "roleId" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "uploadDisabled" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckInAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "deletedAt", "email", "id", "lastCheckInAt", "name", "passwordHash", "points", "roleId", "updatedAt", "uploadDisabled") SELECT "createdAt", "deletedAt", "email", "id", "lastCheckInAt", "name", "passwordHash", "points", "roleId", "updatedAt", "uploadDisabled" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserBan_userId_createdAt_idx" ON "UserBan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBan_expiresAt_idx" ON "UserBan"("expiresAt");

-- CreateIndex
CREATE INDEX "UserBan_revokedAt_idx" ON "UserBan"("revokedAt");

-- CreateIndex
CREATE INDEX "IpBan_ip_createdAt_idx" ON "IpBan"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "IpBan_expiresAt_idx" ON "IpBan"("expiresAt");

-- CreateIndex
CREATE INDEX "IpBan_revokedAt_idx" ON "IpBan"("revokedAt");
