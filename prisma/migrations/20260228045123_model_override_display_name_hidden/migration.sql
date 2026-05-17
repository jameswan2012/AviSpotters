-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ModelOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manufacturerId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "rangeKm" INTEGER,
    "cruiseSpeedKmh" INTEGER,
    "mtowKg" INTEGER,
    "enginesJson" TEXT,
    "layoutsJson" TEXT,
    "operatorsJson" TEXT,
    "imagesJson" TEXT,
    "notes" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModelOverride_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ModelOverride" ("createdAt", "cruiseSpeedKmh", "enginesJson", "familyId", "id", "imagesJson", "layoutsJson", "manufacturerId", "modelId", "mtowKg", "notes", "operatorsJson", "rangeKm", "summary", "updatedAt", "updatedById") SELECT "createdAt", "cruiseSpeedKmh", "enginesJson", "familyId", "id", "imagesJson", "layoutsJson", "manufacturerId", "modelId", "mtowKg", "notes", "operatorsJson", "rangeKm", "summary", "updatedAt", "updatedById" FROM "ModelOverride";
DROP TABLE "ModelOverride";
ALTER TABLE "new_ModelOverride" RENAME TO "ModelOverride";
CREATE INDEX "ModelOverride_manufacturerId_familyId_idx" ON "ModelOverride"("manufacturerId", "familyId");
CREATE UNIQUE INDEX "ModelOverride_manufacturerId_familyId_modelId_key" ON "ModelOverride"("manufacturerId", "familyId", "modelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
