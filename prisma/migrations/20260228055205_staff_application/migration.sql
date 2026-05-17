-- CreateTable
CREATE TABLE "StaffApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tracksJson" TEXT,
    "imagesJson" TEXT,
    "answersJson" TEXT,
    "submittedAt" DATETIME,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "decisionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffApplicationQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "promptJson" TEXT NOT NULL,
    "imagePath" TEXT,
    "imageMime" TEXT,
    "imageSizeBytes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffApplicationQuestion_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StaffApplication_status_createdAt_idx" ON "StaffApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StaffApplication_userId_createdAt_idx" ON "StaffApplication"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffApplicationQuestion_active_order_idx" ON "StaffApplicationQuestion"("active", "order");

-- CreateIndex
CREATE INDEX "StaffApplicationQuestion_updatedAt_idx" ON "StaffApplicationQuestion"("updatedAt");
