import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";

const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const CONFIG_UPLOAD_DIR = (process.env.UPLOAD_DIR || "").trim();
const UPLOAD_DIR = CONFIG_UPLOAD_DIR || PUBLIC_UPLOAD_DIR;
const VIDEO_DIR = path.join(UPLOAD_DIR, "videos");
const PUBLIC_VIDEO_DIR = path.join(PUBLIC_UPLOAD_DIR, "videos");

async function ensureVideoDirs() {
  await fs.mkdir(VIDEO_DIR, { recursive: true });
  if (PUBLIC_VIDEO_DIR !== VIDEO_DIR) await fs.mkdir(PUBLIC_VIDEO_DIR, { recursive: true });
}

async function writeVideoAsset(filename: string, bytes: Buffer) {
  await ensureVideoDirs();
  await fs.writeFile(path.join(VIDEO_DIR, filename), bytes);
  if (PUBLIC_VIDEO_DIR !== VIDEO_DIR) {
    await fs.writeFile(path.join(PUBLIC_VIDEO_DIR, filename), bytes);
  }
}

async function removeVideoAsset(filename: string) {
  try {
    await fs.unlink(path.join(VIDEO_DIR, filename));
  } catch {}
  if (PUBLIC_VIDEO_DIR !== VIDEO_DIR) {
    try {
      await fs.unlink(path.join(PUBLIC_VIDEO_DIR, filename));
    } catch {}
  }
}

// 辅助函数：检查是否是视频所有者
async function isVideoOwner(videoId: string, userId: string): Promise<boolean> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { account: { select: { userId: true } } },
  });
  return video?.account?.userId === userId;
}

// 辅助函数：检查是否在3个月修改期内
function canModifyVideo(createdAt: Date): boolean {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return createdAt > threeMonthsAgo;
}

function parseAircraftInfoJson(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

// GET /api/video/videos/[id] - 获取单个视频详情
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      account: {
        select: {
          id: true,
          nickname: true,
          avatarPath: true,
          avatarMime: true,
          certificationStatus: true,
          certificationScore: true,
          userId: true,
        },
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const aircraftInfo = parseAircraftInfoJson(video.aircraftInfoJson);
  const relatedPhotoId = typeof aircraftInfo.relatedPhotoId === "string" ? aircraftInfo.relatedPhotoId : "";
  const relatedPhoto = relatedPhotoId
    ? await prisma.photo.findFirst({
        where: { id: relatedPhotoId, status: "approved" },
        select: {
          id: true,
          title: true,
          registration: true,
          airline: true,
          aircraftModel: true,
          shotAirport: true,
          shotAt: true,
        },
      })
    : null;

  // 检查可见性权限
  let canView = true;
  if (video.visibility === "private") {
    if (!session) {
      canView = false;
    } else {
      const userAccount = await prisma.videoAccount.findUnique({
        where: { userId: session.userId },
      });
      canView = userAccount?.id === video.accountId;
    }
  } else if (video.visibility === "followers") {
    if (!session) {
      canView = false;
    } else {
      const userAccount = await prisma.videoAccount.findUnique({
        where: { userId: session.userId },
      });
      if (userAccount) {
        const follow = await prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userAccount.id,
              followingId: video.accountId,
            },
          },
        });
        canView = !!follow;
      } else {
        canView = false;
      }
    }
  }

  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 增加浏览计数
  await prisma.video.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  // 更新账号总浏览量
  await prisma.videoAccount.update({
    where: { id: video.accountId },
    data: { totalViews: { increment: 1 } },
  });

  // 检查是否已点赞/收藏
  let isLiked = false;
  let isFavorited = false;
  let isFollowing = false;

  if (session) {
    const userAccount = await prisma.videoAccount.findUnique({
      where: { userId: session.userId },
    });
    if (userAccount) {
      const like = await prisma.videoLike.findUnique({
        where: {
          videoId_accountId: {
            videoId: id,
            accountId: userAccount.id,
          },
        },
      });
      isLiked = !!like;

      const favorite = await prisma.videoFavorite.findUnique({
        where: {
          videoId_accountId: {
            videoId: id,
            accountId: userAccount.id,
          },
        },
      });
      isFavorited = !!favorite;

      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userAccount.id,
            followingId: video.accountId,
          },
        },
      });
      isFollowing = !!follow;
    }
  }

  // 检查是否可以修改
  const canModify = !video.descriptionModified && canModifyVideo(video.createdAt);
  const isOwner = !!session && session.userId === video.account.userId;

  return NextResponse.json({
    video: {
      id: video.id,
      type: video.type,
      description: video.description,
      location: video.location,
      aircraftInfoJson: video.aircraftInfoJson,
      tagsJson: video.tagsJson,
      isOriginal: video.isOriginal,
      visibility: video.visibility,
      thumbnailPath: video.thumbnailPath,
      thumbnailMime: video.thumbnailMime,
      imagePathsJson: video.imagePathsJson,
      videoPath: video.videoPath,
      videoMime: video.videoMime,
      videoDuration: video.videoDuration,
      viewCount: video.viewCount + 1,
      likeCount: video.likeCount,
      commentCount: video.commentCount,
      shareCount: video.shareCount,
      favoriteCount: video.favoriteCount,
      publishedAt: video.publishedAt,
      createdAt: video.createdAt,
      canModify,
      isOwner,
      descriptionModified: video.descriptionModified,
      relatedPhoto,
      account: video.account,
      isLiked,
      isFavorited,
      isFollowing,
    },
  });
}

// PUT /api/video/videos/[id] - 修改视频封面/文案 (3个月内可修改一次)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const isOwner = await isVideoOwner(id, session.userId);
  if (!isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      createdAt: true,
      descriptionModified: true,
      accountId: true,
    },
  });

  if (!video) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 检查是否已修改过
  if (video.descriptionModified) {
    return NextResponse.json({ error: "already modified" }, { status: 400 });
  }

  // 检查是否在3个月修改期内
  if (!canModifyVideo(video.createdAt)) {
    return NextResponse.json({ error: "modification period expired" }, { status: 400 });
  }

  const formData = await request.formData();
  const newDescription = formData.get("description") as string;
  const newThumbnail = formData.get("thumbnail") as File | null;
  const relatedPhotoIdRaw = String(formData.get("relatedPhotoId") || "").trim();

  // 验证描述长度
  if (newDescription && newDescription.length > 120) {
    return NextResponse.json({ error: "description max 120 chars" }, { status: 400 });
  }

  const updateData: any = {
    descriptionModified: true,
    descriptionModifiedAt: new Date(),
    lastModifiedAt: new Date(),
  };

  // 更新描述
  if (newDescription !== undefined) {
    updateData.description = newDescription.trim();
  }

  if (relatedPhotoIdRaw) {
    const linkedPhoto = await prisma.photo.findFirst({
      where: { id: relatedPhotoIdRaw, userId: session.userId, status: "approved" },
      select: { id: true },
    });
    if (!linkedPhoto) return NextResponse.json({ error: "invalid related photo" }, { status: 400 });
    const current = parseAircraftInfoJson((await prisma.video.findUnique({ where: { id }, select: { aircraftInfoJson: true } }))?.aircraftInfoJson ?? null);
    current.relatedPhotoId = relatedPhotoIdRaw;
    updateData.aircraftInfoJson = JSON.stringify(current);
  } else if (formData.has("relatedPhotoId")) {
    const current = parseAircraftInfoJson((await prisma.video.findUnique({ where: { id }, select: { aircraftInfoJson: true } }))?.aircraftInfoJson ?? null);
    delete current.relatedPhotoId;
    updateData.aircraftInfoJson = JSON.stringify(current);
  }

  // 更新封面
  if (newThumbnail && newThumbnail.size > 0) {
    if (newThumbnail.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "thumbnail must be less than 5MB" }, { status: 400 });
    }
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(newThumbnail.type)) {
      return NextResponse.json({ error: "thumbnail must be jpg or png" }, { status: 400 });
    }

    const ext = newThumbnail.type === "image/png" ? "png" : "jpg";
    const filename = `thumb-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await newThumbnail.arrayBuffer());
    await writeVideoAsset(filename, buffer);

    updateData.thumbnailPath = filename;
    updateData.thumbnailMime = newThumbnail.type;
  }

  const updated = await prisma.video.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/video/videos/[id] - 删除视频
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const isOwner = await isVideoOwner(id, session.userId);
  if (!isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      videoPath: true,
      thumbnailPath: true,
      imagePathsJson: true,
      accountId: true,
    },
  });

  if (!video) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 删除文件
  if (video.videoPath) {
    await removeVideoAsset(video.videoPath);
  }
  if (video.thumbnailPath) {
    await removeVideoAsset(video.thumbnailPath);
  }
  if (video.imagePathsJson) {
    const imagePaths = JSON.parse(video.imagePathsJson) as string[];
    for (const img of imagePaths) {
      await removeVideoAsset(img);
    }
  }

  // 删除视频记录
  await prisma.video.delete({ where: { id } });

  // 更新账号视频数
  await prisma.videoAccount.update({
    where: { id: video.accountId },
    data: { videoCount: { decrement: 1 } },
  });

  return NextResponse.json({ success: true });
}
