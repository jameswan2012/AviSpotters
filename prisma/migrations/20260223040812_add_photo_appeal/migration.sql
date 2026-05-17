/*
  Warnings:

  - You are about to drop the column `reviewedAt` on the `PhotoAppeal` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedById` on the `PhotoAppeal` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PhotoAppeal` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PhotoAppeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "staffNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoAppeal_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhotoAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhotoAppeal_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PhotoAppeal" ("createdAt", "id", "photoId", "reason", "staffNote", "status", "userId") SELECT "createdAt", "id", "photoId", "reason", "staffNote", "status", "userId" FROM "PhotoAppeal";
DROP TABLE "PhotoAppeal";
ALTER TABLE "new_PhotoAppeal" RENAME TO "PhotoAppeal";
CREATE INDEX "PhotoAppeal_status_createdAt_idx" ON "PhotoAppeal"("status", "createdAt");
CREATE INDEX "PhotoAppeal_userId_createdAt_idx" ON "PhotoAppeal"("userId", "createdAt");
CREATE UNIQUE INDEX "PhotoAppeal_photoId_key" ON "PhotoAppeal"("photoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
