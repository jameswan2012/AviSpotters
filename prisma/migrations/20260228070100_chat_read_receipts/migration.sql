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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarMime", "avatarPath", "avatarSizeBytes", "avatarUpdatedAt", "backgroundMime", "backgroundPath", "backgroundSizeBytes", "backgroundUpdatedAt", "createdAt", "deletedAt", "email", "id", "lastCheckInAt", "lastPriorityPurchaseAt", "lastSeenAt", "name", "passwordHash", "points", "priorityPasses", "profileBio", "rejectStreak", "roleId", "updatedAt", "uploadDisabled") SELECT "avatarMime", "avatarPath", "avatarSizeBytes", "avatarUpdatedAt", "backgroundMime", "backgroundPath", "backgroundSizeBytes", "backgroundUpdatedAt", "createdAt", "deletedAt", "email", "id", "lastCheckInAt", "lastPriorityPurchaseAt", "lastSeenAt", "name", "passwordHash", "points", "priorityPasses", "profileBio", "rejectStreak", "roleId", "updatedAt", "uploadDisabled" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
