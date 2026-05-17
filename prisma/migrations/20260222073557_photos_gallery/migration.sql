-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "registration" TEXT NOT NULL,
    "shotAirport" TEXT NOT NULL,
    "aircraftModel" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "shotAt" TEXT NOT NULL,
    "ccAgree" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "msn" TEXT,
    "serialNumber" TEXT,
    "description" TEXT,
    "reviewerNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewDecision" TEXT,
    "reviewReason" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "originalPath" TEXT NOT NULL,
    "displayPath" TEXT NOT NULL,
    "originalMime" TEXT NOT NULL,
    "displayMime" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "exifJson" TEXT,
    "exifSummaryJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Photo_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Photo_userId_status_createdAt_idx" ON "Photo"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Photo_status_createdAt_idx" ON "Photo"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Photo_registration_idx" ON "Photo"("registration");

-- CreateIndex
CREATE INDEX "Photo_shotAirport_idx" ON "Photo"("shotAirport");

-- CreateIndex
CREATE INDEX "Photo_aircraftModel_idx" ON "Photo"("aircraftModel");

-- CreateIndex
CREATE INDEX "Photo_airline_idx" ON "Photo"("airline");
