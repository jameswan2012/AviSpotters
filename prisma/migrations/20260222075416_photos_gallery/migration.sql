/*
  Warnings:

  - Added the required column `thumbPath` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "PhotoLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoLike_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhotoLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhotoComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoComment_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhotoComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhotoReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoReport_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhotoReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedReviewerId" TEXT,
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
    "uploaderMessage" TEXT,
    "staffNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewDecision" TEXT,
    "reviewReason" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "originalPath" TEXT NOT NULL,
    "displayPath" TEXT NOT NULL,
    "thumbPath" TEXT NOT NULL,
    "originalMime" TEXT NOT NULL,
    "displayMime" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "watermarkJson" TEXT,
    "exifJson" TEXT,
    "exifSummaryJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Photo_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Photo_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("aircraftModel", "airline", "ccAgree", "createdAt", "description", "displayMime", "displayPath", "exifJson", "exifSummaryJson", "featured", "fileName", "fileSizeBytes", "height", "id", "msn", "originalMime", "originalPath", "registration", "reviewDecision", "reviewReason", "reviewedAt", "reviewedById", "serialNumber", "shotAirport", "shotAt", "staffNote", "status", "title", "updatedAt", "uploaderMessage", "userId", "width") SELECT "aircraftModel", "airline", "ccAgree", "createdAt", "description", "displayMime", "displayPath", "exifJson", "exifSummaryJson", "featured", "fileName", "fileSizeBytes", "height", "id", "msn", "originalMime", "originalPath", "registration", "reviewDecision", "reviewReason", "reviewedAt", "reviewedById", "serialNumber", "shotAirport", "shotAt", "staffNote", "status", "title", "updatedAt", "uploaderMessage", "userId", "width" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_userId_status_createdAt_idx" ON "Photo"("userId", "status", "createdAt");
CREATE INDEX "Photo_status_createdAt_idx" ON "Photo"("status", "createdAt");
CREATE INDEX "Photo_registration_idx" ON "Photo"("registration");
CREATE INDEX "Photo_shotAirport_idx" ON "Photo"("shotAirport");
CREATE INDEX "Photo_aircraftModel_idx" ON "Photo"("aircraftModel");
CREATE INDEX "Photo_airline_idx" ON "Photo"("airline");
CREATE INDEX "Photo_assignedReviewerId_idx" ON "Photo"("assignedReviewerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PhotoLike_userId_createdAt_idx" ON "PhotoLike"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoLike_photoId_userId_key" ON "PhotoLike"("photoId", "userId");

-- CreateIndex
CREATE INDEX "PhotoComment_photoId_createdAt_idx" ON "PhotoComment"("photoId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoComment_userId_createdAt_idx" ON "PhotoComment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoReport_status_createdAt_idx" ON "PhotoReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoReport_photoId_createdAt_idx" ON "PhotoReport"("photoId", "createdAt");
