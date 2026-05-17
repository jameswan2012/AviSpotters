-- CreateTable
CREATE TABLE "VideoAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarPath" TEXT,
    "avatarMime" TEXT,
    "bio" TEXT,
    "region" TEXT,
    "gender" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "certificationStatus" TEXT NOT NULL DEFAULT 'none',
    "certificationScore" INTEGER NOT NULL DEFAULT 0,
    "certificationWarnings" INTEGER NOT NULL DEFAULT 0,
    "certificationBannedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'video',
    "videoPath" TEXT,
    "videoMime" TEXT,
    "videoSizeBytes" INTEGER,
    "videoDuration" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailPath" TEXT,
    "thumbnailMime" TEXT,
    "imagePathsJson" TEXT,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "location" TEXT,
    "aircraftInfoJson" TEXT,
    "tagsJson" TEXT,
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "originalConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastModifiedAt" DATETIME,
    "descriptionModified" BOOLEAN NOT NULL DEFAULT false,
    "descriptionModifiedAt" DATETIME,
    CONSTRAINT "Video_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VideoComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoComment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoComment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "VideoComment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT,
    "commentId" TEXT,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoLike_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "VideoComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoLike_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "shareType" TEXT NOT NULL DEFAULT 'private',
    "targetRoomId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoShare_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoShare_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoShare_targetRoomId_fkey" FOREIGN KEY ("targetRoomId") REFERENCES "ChatRoom" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoFavorite_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoFavorite_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoCertification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "scoreBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoCertification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoCertification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "videoId" TEXT,
    "commentId" TEXT,
    "fromAccountId" TEXT,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoNotification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "VideoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoNotification_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoNotification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "VideoComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoNotification_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "VideoAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAccount_userId_key" ON "VideoAccount"("userId");

-- CreateIndex
CREATE INDEX "VideoAccount_userId_idx" ON "VideoAccount"("userId");

-- CreateIndex
CREATE INDEX "VideoAccount_certificationStatus_idx" ON "VideoAccount"("certificationStatus");

-- CreateIndex
CREATE INDEX "VideoAccount_createdAt_idx" ON "VideoAccount"("createdAt");

-- CreateIndex
CREATE INDEX "Video_accountId_status_createdAt_idx" ON "Video"("accountId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Video_status_createdAt_idx" ON "Video"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Video_visibility_status_idx" ON "Video"("visibility", "status");

-- CreateIndex
CREATE INDEX "Video_publishedAt_idx" ON "Video"("publishedAt");

-- CreateIndex
CREATE INDEX "VideoTag_isActive_idx" ON "VideoTag"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTag_name_key" ON "VideoTag"("name");

-- CreateIndex
CREATE INDEX "VideoComment_videoId_createdAt_idx" ON "VideoComment"("videoId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoComment_accountId_createdAt_idx" ON "VideoComment"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoComment_parentId_idx" ON "VideoComment"("parentId");

-- CreateIndex
CREATE INDEX "VideoLike_accountId_createdAt_idx" ON "VideoLike"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoLike_videoId_accountId_key" ON "VideoLike"("videoId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoLike_commentId_accountId_key" ON "VideoLike"("commentId", "accountId");

-- CreateIndex
CREATE INDEX "VideoShare_accountId_createdAt_idx" ON "VideoShare"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoShare_videoId_createdAt_idx" ON "VideoShare"("videoId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoFavorite_accountId_createdAt_idx" ON "VideoFavorite"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoFavorite_videoId_accountId_key" ON "VideoFavorite"("videoId", "accountId");

-- CreateIndex
CREATE INDEX "UserFollow_followingId_createdAt_idx" ON "UserFollow"("followingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "VideoCertification_accountId_status_idx" ON "VideoCertification"("accountId", "status");

-- CreateIndex
CREATE INDEX "VideoCertification_status_createdAt_idx" ON "VideoCertification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VideoNotification_accountId_isRead_createdAt_idx" ON "VideoNotification"("accountId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "VideoNotification_createdAt_idx" ON "VideoNotification"("createdAt");
