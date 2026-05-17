import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModerationConfig, matchModeration } from "@/lib/moderation";

const USER_LIMIT = 8;
const PHOTO_LIMIT = 8;
const VIDEO_LIMIT = 8;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({
      ok: true,
      blocked: false,
      query: "",
      users: [],
      photos: [],
      videos: [],
      totals: { users: 0, photos: 0, videos: 0 },
    });
  }

  const query = q.slice(0, 64);
  const moderation = await getModerationConfig();
  const hit = matchModeration(query, moderation);
  if (hit.level !== "none") {
    return NextResponse.json({
      ok: true,
      blocked: true,
      level: hit.level,
      matches: hit.matches.slice(0, 20),
      query,
    });
  }

  const userWhere = {
    deletedAt: null,
    OR: [{ name: { contains: query, mode: "insensitive" as const } }],
  };

  const photoWhere = {
    status: "approved",
    OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
      { registration: { contains: query, mode: "insensitive" as const } },
      { shotAirport: { contains: query, mode: "insensitive" as const } },
      { aircraftModel: { contains: query, mode: "insensitive" as const } },
      { airline: { contains: query, mode: "insensitive" as const } },
      { msn: { contains: query, mode: "insensitive" as const } },
      { user: { name: { contains: query, mode: "insensitive" as const } } },
    ],
  };

  const videoWhere = {
    status: "approved",
    visibility: "public",
    publishedAt: { not: null },
    OR: [
      { description: { contains: query, mode: "insensitive" as const } },
      { location: { contains: query, mode: "insensitive" as const } },
      { aircraftInfoJson: { contains: query, mode: "insensitive" as const } },
      { account: { nickname: { contains: query, mode: "insensitive" as const } } },
    ],
  };

  const [users, photos, videos, usersTotal, photosTotal, videosTotal] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy: [{ createdAt: "desc" }],
      take: USER_LIMIT,
      select: { id: true, name: true, email: true, roleId: true, avatarPath: true },
    }),
    prisma.photo.findMany({
      where: photoWhere,
      orderBy: [{ createdAt: "desc" }],
      take: PHOTO_LIMIT,
      select: {
        id: true,
        title: true,
        registration: true,
        shotAirport: true,
        aircraftModel: true,
        airline: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.video.findMany({
      where: videoWhere,
      orderBy: [{ createdAt: "desc" }],
      take: VIDEO_LIMIT,
      select: {
        id: true,
        type: true,
        description: true,
        location: true,
        thumbnailPath: true,
        createdAt: true,
        account: { select: { id: true, nickname: true } },
      },
    }),
    prisma.user.count({ where: userWhere }),
    prisma.photo.count({ where: photoWhere }),
    prisma.video.count({ where: videoWhere }),
  ]);

  return NextResponse.json({
    ok: true,
    blocked: false,
    query,
    users: users.map((u) => ({
      id: u.id,
      name: (u.name || u.email).trim(),
      roleId: u.roleId,
      avatarPath: u.avatarPath || null,
    })),
    photos: photos.map((p) => ({
      id: p.id,
      title: p.title || p.registration,
      registration: p.registration,
      shotAirport: p.shotAirport,
      aircraftModel: p.aircraftModel,
      airline: p.airline,
      authorName: (p.user.name || p.user.email).trim(),
    })),
    videos: videos.map((v) => ({
      id: v.id,
      type: v.type,
      description: (v.description || "").trim(),
      location: v.location || "",
      thumbnailPath: v.thumbnailPath || null,
      accountId: v.account.id,
      accountName: v.account.nickname,
      createdAt: v.createdAt.toISOString(),
    })),
    totals: {
      users: usersTotal,
      photos: photosTotal,
      videos: videosTotal,
    },
  });
}
