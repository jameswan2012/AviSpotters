-- AlterTable
ALTER TABLE "User" ADD COLUMN "photoDeleteVerifiedUntil" DATETIME;

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadataJson" TEXT,
    CONSTRAINT "EmailOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailVerifyGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "purpose" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    CONSTRAINT "EmailVerifyGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmailOtp_email_purpose_createdAt_idx" ON "EmailOtp"("email", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOtp_userId_purpose_createdAt_idx" ON "EmailOtp"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOtp_purpose_expiresAt_idx" ON "EmailOtp"("purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerifyGrant_email_purpose_createdAt_idx" ON "EmailVerifyGrant"("email", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerifyGrant_userId_purpose_createdAt_idx" ON "EmailVerifyGrant"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerifyGrant_purpose_expiresAt_idx" ON "EmailVerifyGrant"("purpose", "expiresAt");
