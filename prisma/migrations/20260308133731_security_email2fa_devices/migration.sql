-- CreateTable
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "label" TEXT,
    "firstVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginDeviceChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "verifiedAt" DATETIME,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginDeviceChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "avatarPath" TEXT,
    "avatarMime" TEXT,
    "avatarSizeBytes" INTEGER,
    "avatarUpdatedAt" DATETIME,
    "backgroundPath" TEXT,
    "backgroundMime" TEXT,
    "backgroundSizeBytes" INTEGER,
    "backgroundUpdatedAt" DATETIME,
    "profileBio" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "priorityPasses" INTEGER NOT NULL DEFAULT 0,
    "lastPriorityPurchaseAt" DATETIME,
    "roleId" INTEGER NOT NULL DEFAULT 0,
    "rejectStreak" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "uploadDisabled" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckInAt" DATETIME,
    "lastSeenAt" DATETIME,
    "chatReadReceiptsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "email2faEnabled" BOOLEAN NOT NULL DEFAULT true,
    "photoDeleteVerifiedUntil" DATETIME,
    "lastLoginIp" TEXT,
    "lastLoginUserAgent" TEXT,
    "lastLoginAt" DATETIME,
    "createdIp" TEXT,
    "createdUserAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarMime", "avatarPath", "avatarSizeBytes", "avatarUpdatedAt", "backgroundMime", "backgroundPath", "backgroundSizeBytes", "backgroundUpdatedAt", "chatReadReceiptsEnabled", "createdAt", "createdIp", "createdUserAgent", "deletedAt", "email", "id", "lastCheckInAt", "lastLoginAt", "lastLoginIp", "lastLoginUserAgent", "lastPriorityPurchaseAt", "lastSeenAt", "name", "passwordHash", "photoDeleteVerifiedUntil", "points", "priorityPasses", "profileBio", "rejectStreak", "roleId", "updatedAt", "uploadDisabled") SELECT "avatarMime", "avatarPath", "avatarSizeBytes", "avatarUpdatedAt", "backgroundMime", "backgroundPath", "backgroundSizeBytes", "backgroundUpdatedAt", "chatReadReceiptsEnabled", "createdAt", "createdIp", "createdUserAgent", "deletedAt", "email", "id", "lastCheckInAt", "lastLoginAt", "lastLoginIp", "lastLoginUserAgent", "lastPriorityPurchaseAt", "lastSeenAt", "name", "passwordHash", "photoDeleteVerifiedUntil", "points", "priorityPasses", "profileBio", "rejectStreak", "roleId", "updatedAt", "uploadDisabled" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TrustedDevice_userId_lastUsedAt_idx" ON "TrustedDevice"("userId", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedDevice_userId_deviceHash_key" ON "TrustedDevice"("userId", "deviceHash");

-- CreateIndex
CREATE INDEX "LoginDeviceChallenge_expiresAt_idx" ON "LoginDeviceChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginDeviceChallenge_userId_createdAt_idx" ON "LoginDeviceChallenge"("userId", "createdAt");
