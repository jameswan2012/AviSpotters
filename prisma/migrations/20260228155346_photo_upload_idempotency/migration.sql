-- AlterTable
ALTER TABLE "Photo" ADD COLUMN "clientUploadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Photo_userId_clientUploadId_key" ON "Photo"("userId", "clientUploadId");
