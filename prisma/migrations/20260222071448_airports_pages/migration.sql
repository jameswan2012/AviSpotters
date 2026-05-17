/*
  Warnings:

  - You are about to drop the column `name` on the `Airport` table. All the data in the column will be lost.
  - Added the required column `nameEn` to the `Airport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameZh` to the `Airport` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Airport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iata" TEXT,
    "icao" TEXT,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "openedOn" TEXT,
    "category" TEXT,
    "nature" TEXT,
    "elevationM" INTEGER,
    "terminalsJson" TEXT,
    "airlinesJson" TEXT,
    "trafficJson" TEXT,
    "runwaysJson" TEXT,
    "photosJson" TEXT,
    "taxiwayPhotosJson" TEXT,
    "lat" REAL,
    "lon" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Airport" ("city", "country", "createdAt", "iata", "icao", "id", "lat", "lon", "notes", "timezone", "updatedAt") SELECT "city", "country", "createdAt", "iata", "icao", "id", "lat", "lon", "notes", "timezone", "updatedAt" FROM "Airport";
DROP TABLE "Airport";
ALTER TABLE "new_Airport" RENAME TO "Airport";
CREATE UNIQUE INDEX "Airport_iata_key" ON "Airport"("iata");
CREATE UNIQUE INDEX "Airport_icao_key" ON "Airport"("icao");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
