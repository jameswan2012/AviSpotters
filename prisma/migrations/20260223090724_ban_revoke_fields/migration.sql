-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IpBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "revokedById" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IpBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IpBan_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IpBan" ("createdAt", "createdById", "expiresAt", "id", "ip", "reason", "revokedAt", "updatedAt") SELECT "createdAt", "createdById", "expiresAt", "id", "ip", "reason", "revokedAt", "updatedAt" FROM "IpBan";
DROP TABLE "IpBan";
ALTER TABLE "new_IpBan" RENAME TO "IpBan";
CREATE INDEX "IpBan_ip_createdAt_idx" ON "IpBan"("ip", "createdAt");
CREATE INDEX "IpBan_expiresAt_idx" ON "IpBan"("expiresAt");
CREATE INDEX "IpBan_revokedAt_idx" ON "IpBan"("revokedAt");
CREATE TABLE "new_UserBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "revokedById" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserBan_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UserBan" ("createdAt", "createdById", "expiresAt", "id", "reason", "revokedAt", "updatedAt", "userId") SELECT "createdAt", "createdById", "expiresAt", "id", "reason", "revokedAt", "updatedAt", "userId" FROM "UserBan";
DROP TABLE "UserBan";
ALTER TABLE "new_UserBan" RENAME TO "UserBan";
CREATE INDEX "UserBan_userId_createdAt_idx" ON "UserBan"("userId", "createdAt");
CREATE INDEX "UserBan_expiresAt_idx" ON "UserBan"("expiresAt");
CREATE INDEX "UserBan_revokedAt_idx" ON "UserBan"("revokedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
