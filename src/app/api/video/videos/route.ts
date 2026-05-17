import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { notifyStaffReviewers } from "@/lib/user-notifications";
import { getPublishingVideoAccount } from "@/lib/video-account";
import { assertMagicMatchesAllowed, scanWithClamAVIfEnabled } from "@/lib/upload-security";
import { uploadsRoot, writeFileEnsured } from "@/lib/uploads";

const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "videos");

async function writeVideoAsset(filename: string, bytes: Uint8Array) {
  await writeFileEnsured(path.join(uploadsRoot(), "videos", filename), bytes);
  await fs.mkdir(PUBLIC_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_UPLOAD_DIR, filename), Buffer.from(bytes));
}

function parseAircraftInfo(json: string | null): { relatedPhotoId?: string | null } | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as { relatedPhotoId?: string | null };
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const cursor = String(searchParams.get("cursor") || "").trim();
  const filter = String(searchParams.get("filter") || "recommended").trim();
  const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit") || "10") || 10));

  const where: any = {
    status: "approved",
    visibility: "public",
    publishedAt: { not: null },
  };
  if (cursor) where.createdAt = { lt: new Date(cursor) };

  const rows = await prisma.video.findMany({
    where,
    orderBy: filter === "latest" ? [{ createdAt: "desc" }] : [{ qualityScore: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    include: {
      account: {
        select: {
          id: true,
          nickname: true,
          avatarPath: true,
          avatarMime: true,
          certificationStatus: true,
          certificationScore: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const next = rows.pop();
    nextCursor = next?.createdAt?.toISOString() || null;
  }

  let likedIds = new Set<string>();
  let followingIds = new Set<string>();
  if (session) {
    const myAccount = await prisma.videoAccount.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (myAccount) {
      const [likes, follows] = await Promise.all([
        prisma.videoLike.findMany({
          where: { accountId: myAccount.id, videoId: { in: rows.map((v) => v.id) } },
          select: { videoId: true },
        }),
        prisma.userFollow.findMany({
          where: { followerId: myAccount.id, followingId: { in: rows.map((v) => v.accountId) } },
          select: { followingId: true },
        }),
      ]);
      likedIds = new Set(likes.map((x) => x.videoId));
      followingIds = new Set(follows.map((x) => x.followingId));
    }
  }

  const relatedPhotoIds = rows
    .map((row) => parseAircraftInfo(row.aircraftInfoJson)?.relatedPhotoId || null)
    .filter((x): x is string => !!x);
  const photos = relatedPhotoIds.length
    ? await prisma.photo.findMany({
        where: { id: { in: relatedPhotoIds }, status: "approved" },
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
    : [];
  const photoMap = new Map(photos.map((p) => [p.id, p]));

  return NextResponse.json({
    videos: rows.map((row) => {
      const relatedPhotoId = parseAircraftInfo(row.aircraftInfoJson)?.relatedPhotoId || null;
      return {
        id: row.id,
        type: row.type,
        description: row.description,
        location: row.location,
        thumbnailPath: row.thumbnailPath,
        videoPath: row.videoPath,
        imagePathsJson: row.imagePathsJson,
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
        shareCount: row.shareCount,
        favoriteCount: row.favoriteCount,
        createdAt: row.createdAt,
        account: row.account,
        relatedPhoto: relatedPhotoId ? photoMap.get(relatedPhotoId) || null : null,
        isLiked: likedIds.has(row.id),
        isFollowing: followingIds.has(row.account.id),
      };
    }),
    nextCursor,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await getPublishingVideoAccount(session.userId);
  if (!account) {
    return NextResponse.json({ error: "video_account_required" }, { status: 403 });
  }

  const formData = await request.formData();
  const type = String(formData.get("type") || "").trim() === "image" ? "image" : "video";
  const description = String(formData.get("description") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const visibility = String(formData.get("visibility") || "public").trim();
  const tags = String(formData.get("tags") || "[]");
  const aircraftInfo = String(formData.get("aircraftInfo") || "{}");
  const isOriginal = String(formData.get("isOriginal") || "false") === "true";
  const originalConfirmed = String(formData.get("originalConfirmed") || "false") === "true";

  if (!description) return NextResponse.json({ error: "description_required" }, { status: 400 });
  if (!originalConfirmed) return NextResponse.json({ error: "original_confirmation_required" }, { status: 400 });

  let thumbnailPath: string | null = null;
  let thumbnailMime: string | null = null;
  let videoPath: string | null = null;
  let videoMime: string | null = null;
  let imagePaths: string[] = [];

  const thumbnail = formData.get("thumbnail") as File | null;
  if (thumbnail && thumbnail.size > 0) {
    const thumbBytes = new Uint8Array(await thumbnail.arrayBuffer());
    assertMagicMatchesAllowed(thumbBytes, thumbnail.type === "image/png" ? ["png"] : ["jpeg"]);
    await scanWithClamAVIfEnabled(thumbBytes, thumbnail.name || "video-thumb");
    const ext = thumbnail.type === "image/png" ? "png" : "jpg";
    thumbnailPath = `thumb-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    thumbnailMime = thumbnail.type;
    await writeVideoAsset(thumbnailPath, thumbBytes);
  }

  if (type === "video") {
    const file = formData.get("video") as File | null;
    if (!file || file.size === 0) return NextResponse.json({ error: "video_required" }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    assertMagicMatchesAllowed(bytes, file.type === "video/webm" ? ["webm"] : ["mp4"]);
    await scanWithClamAVIfEnabled(bytes, file.name || "video-upload");
    const ext = file.type === "video/webm" ? "webm" : "mp4";
    videoPath = `video-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    videoMime = file.type || (ext === "webm" ? "video/webm" : "video/mp4");
    await writeVideoAsset(videoPath, bytes);
  } else {
    const files = formData.getAll("images").filter((x): x is File => x instanceof File && x.size > 0);
    if (!files.length) return NextResponse.json({ error: "images_required" }, { status: 400 });
    if (files.length > 9) return NextResponse.json({ error: "images_too_many" }, { status: 400 });
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      assertMagicMatchesAllowed(bytes, file.type === "image/png" ? ["png"] : ["jpeg"]);
      await scanWithClamAVIfEnabled(bytes, file.name || "video-image");
      const ext = file.type === "image/png" ? "png" : "jpg";
      const filename = `img-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
      await writeVideoAsset(filename, bytes);
      imagePaths.push(filename);
    }
    if (!thumbnailPath && imagePaths[0]) {
      thumbnailPath = imagePaths[0];
      thumbnailMime = imagePaths[0].endsWith(".png") ? "image/png" : "image/jpeg";
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const video = await tx.video.create({
      data: {
        accountId: account.id,
        type,
        description,
        location: location || null,
        aircraftInfoJson: aircraftInfo,
        tagsJson: tags,
        isOriginal,
        visibility,
        thumbnailPath,
        thumbnailMime,
        imagePathsJson: imagePaths.length ? JSON.stringify(imagePaths) : null,
        videoPath,
        videoMime,
        status: "pending",
        publishedAt: null,
      },
      select: { id: true },
    });
    await tx.videoAccount.update({
      where: { id: account.id },
      data: { videoCount: { increment: 1 } },
    }).catch(() => {});
    return video;
  });

  await notifyStaffReviewers({
    title: "新影片待審核",
    body: description,
    type: "video_queue_new",
    meta: { videoId: created.id, accountId: account.id },
    excludeUserId: session.userId,
  }).catch(() => {});

  return NextResponse.json({ success: true, videoId: created.id });
}
