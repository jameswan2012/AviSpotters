-- CreateTable
CREATE TABLE "AircraftRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registration" TEXT NOT NULL,
    "aircraftModel" TEXT,
    "airline" TEXT,
    "msn" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AircraftRegistration_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AircraftRegistration_registration_key" ON "AircraftRegistration"("registration");

-- CreateIndex
CREATE INDEX "AircraftRegistration_registration_idx" ON "AircraftRegistration"("registration");
