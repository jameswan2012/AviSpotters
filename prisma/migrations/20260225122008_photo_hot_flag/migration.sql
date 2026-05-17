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
    "categoriesJson" TEXT,
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
    "hot" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Photo" ("aircraftModel", "airline", "assignedReviewerId", "categoriesJson", "ccAgree", "createdAt", "description", "displayMime", "displayPath", "exifJson", "exifSummaryJson", "featured", "fileName", "fileSizeBytes", "height", "id", "msn", "originalMime", "originalPath", "registration", "reviewDecision", "reviewReason", "reviewedAt", "reviewedById", "serialNumber", "shotAirport", "shotAt", "staffNote", "status", "thumbPath", "title", "updatedAt", "uploaderMessage", "userId", "watermarkJson", "width") SELECT "aircraftModel", "airline", "assignedReviewerId", "categoriesJson", "ccAgree", "createdAt", "description", "displayMime", "displayPath", "exifJson", "exifSummaryJson", "featured", "fileName", "fileSizeBytes", "height", "id", "msn", "originalMime", "originalPath", "registration", "reviewDecision", "reviewReason", "reviewedAt", "reviewedById", "serialNumber", "shotAirport", "shotAt", "staffNote", "status", "thumbPath", "title", "updatedAt", "uploaderMessage", "userId", "watermarkJson", "width" FROM "Photo";
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
