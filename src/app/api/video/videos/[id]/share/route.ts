import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getInteractionCapableVideoAccount } from "@/lib/video-account";

function envTrim(name: string) {
  return (process.env[name] || "").trim();
}

function resolveBaseUrl(request: Request) {
  const configured = envTrim("APP_URL") || envTrim("NEXT_PUBLIC_APP_URL") || envTrim("SITE_URL");
  if (configured) return configured.replace(/\/+$/, "");

  const h = request.headers;
  const xfProto = String(h.get("x-forwarded-proto") || "").trim();
  const xfHost = String(h.get("x-forwarded-host") || "").trim();
  const host = xfHost || String(h.get("host") || "").trim();
  const proto = xfProto || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  if (!host) return "https://www.avispotters.net";
  return `${proto}://${host}`;
}

function dmKey(a: string, b: string) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `dm:${x}:${y}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const { id: videoId } = await params;
  const shareType = String(body?.shareType || "").trim();
  const targetUserId = String(body?.targetUserId || "").trim();
  const targetRoomId = String(body?.targetRoomId || "").trim();

  if (shareType !== "private" && shareType !== "group") {
    return NextResponse.json({ error: "invalid_share_type" }, { status: 400 });
  }

  const account = await getInteractionCapableVideoAccount(session.userId);
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      account: { select: { id: true, nickname: true } },
    },
  });
  if (!video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });

  const path = `/video/${encodeURIComponent(videoId)}`;
  const fullUrl = `${resolveBaseUrl(request)}${path}`;
  const thumbnailUrl = video.thumbnailPath
    ? `${resolveBaseUrl(request)}/api/video/stream/${encodeURIComponent(String(video.thumbnailPath).replace(/^\/+/, ""))}`
    : null;

  const attachment = [
    {
      type: "video_share",
      videoId,
      url: fullUrl,
      title: video.description || "Untitled video",
      authorName: video.account.nickname || "AviSpotters",
      thumbnailUrl,
    },
  ];

  let roomId = "";
  if (shareType === "private") {
    if (!targetUserId) return NextResponse.json({ error: "targetUserId_required" }, { status: 400 });
    if (targetUserId === session.userId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const other = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, deletedAt: true } });
    if (!other || other.deletedAt) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const key = dmKey(session.userId, targetUserId);
    const room = await prisma.$transaction(async (tx) => {
      const existing = await tx.chatRoom.findUnique({
        where: { directKey: key },
        select: { id: true },
      });
      if (existing) {
        await tx.chatMember.upsert({
          where: { roomId_userId: { roomId: existing.id, userId: session.userId } },
          create: { roomId: existing.id, userId: session.userId, role: "member" },
          update: {},
        });
        await tx.chatMember.upsert({
          where: { roomId_userId: { roomId: existing.id, userId: targetUserId } },
          create: { roomId: existing.id, userId: targetUserId, role: "member" },
          update: {},
        });
        return existing;
      }

      const created = await tx.chatRoom.create({
        data: { type: "direct", name: null, directKey: key, createdById: session.userId },
        select: { id: true },
      });
      await tx.chatMember.createMany({
        data: [
          { roomId: created.id, userId: session.userId, role: "member" },
          { roomId: created.id, userId: targetUserId, role: "member" },
        ],
      });
      return created;
    });
    roomId = room.id;
  } else {
    if (!targetRoomId) return NextResponse.json({ error: "targetRoomId_required" }, { status: 400 });
    const member = await prisma.chatMember.findUnique({
      where: { roomId_userId: { roomId: targetRoomId, userId: session.userId } },
      select: { roomId: true },
    });
    if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    roomId = targetRoomId;
  }

  const now = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.chatMessage.create({
      data: {
        roomId,
        userId: session.userId,
        kind: "text",
        body: "分享了作品",
        attachmentsJson: JSON.stringify(attachment),
      },
      select: {
        id: true,
        kind: true,
        body: true,
        attachmentsJson: true,
        createdAt: true,
      },
    });
    await tx.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: now },
    });
    await tx.chatMember.update({
      where: { roomId_userId: { roomId, userId: session.userId } },
      data: { lastReadAt: now },
    }).catch(() => {});
    await tx.video.update({
      where: { id: videoId },
      data: { shareCount: { increment: 1 } },
    });
    return created;
  });

  if (video.accountId !== account.id) {
    await prisma.videoNotification.create({
      data: {
        accountId: video.accountId,
        type: "share",
        body: "分享了你的作品",
        fromAccountId: account.id,
        videoId,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, roomId, message });
}
