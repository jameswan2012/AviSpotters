-- AlterTable
ALTER TABLE "AircraftRegistration" ADD COLUMN "keywordsJson" TEXT;

-- AlterTable
ALTER TABLE "Airport" ADD COLUMN "keywordsJson" TEXT;

-- CreateTable
CREATE TABLE "Airline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iata" TEXT,
    "icao" TEXT,
    "nameZh" TEXT,
    "nameEn" TEXT,
    "keywordsJson" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Airline_iata_key" ON "Airline"("iata");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_icao_key" ON "Airline"("icao");

-- CreateIndex
CREATE INDEX "Airline_iata_idx" ON "Airline"("iata");

-- CreateIndex
CREATE INDEX "Airline_icao_idx" ON "Airline"("icao");
