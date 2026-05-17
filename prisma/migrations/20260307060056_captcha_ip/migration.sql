-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "lastLoginIp" TEXT;
ALTER TABLE "User" ADD COLUMN "lastLoginUserAgent" TEXT;

-- CreateTable
CREATE TABLE "CaptchaChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "answerHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" DATETIME,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CaptchaChallenge_expiresAt_idx" ON "CaptchaChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "CaptchaChallenge_createdAt_idx" ON "CaptchaChallenge"("createdAt");
