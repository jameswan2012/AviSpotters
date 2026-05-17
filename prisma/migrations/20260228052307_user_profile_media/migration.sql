-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarMime" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarPath" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarSizeBytes" INTEGER;
ALTER TABLE "User" ADD COLUMN "avatarUpdatedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "backgroundMime" TEXT;
ALTER TABLE "User" ADD COLUMN "backgroundPath" TEXT;
ALTER TABLE "User" ADD COLUMN "backgroundSizeBytes" INTEGER;
ALTER TABLE "User" ADD COLUMN "backgroundUpdatedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "profileBio" TEXT;
