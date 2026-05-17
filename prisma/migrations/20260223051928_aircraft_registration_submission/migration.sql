/*
  Warnings:

  - You are about to drop the `PhotoAppeal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PhotoAppeal";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AircraftRegistrationSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registration" TEXT NOT NULL,
    "aircraftModel" TEXT,
    "airline" TEXT,
    "msn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AircraftRegistrationSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AircraftRegistrationSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AircraftRegistrationSubmission_status_createdAt_idx" ON "AircraftRegistrationSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AircraftRegistrationSubmission_registration_idx" ON "AircraftRegistrationSubmission"("registration");

-- CreateIndex
CREATE INDEX "AircraftRegistrationSubmission_submittedById_createdAt_idx" ON "AircraftRegistrationSubmission"("submittedById", "createdAt");
