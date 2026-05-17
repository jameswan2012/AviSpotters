import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getClientIpFromHeaders } from "@/lib/ip";
import { createLowRiskIncident, enforceHighRiskAction, getModerationConfig, matchModeration } from "@/lib/moderation";
import { getInteractionCapableVideoAccount } from "@/lib/video-account";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = String(searchParams.get("videoId") || "").trim();
  const cursor = String(searchParams.get("cursor") || "").trim();
  const limit = Math.max(1, Math.min(30, Number(searchParams.get("limit") || "20") || 20));

  if (!videoId) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 });
  }

  const where: any = { videoId, parentId: null };
  if (cursor) where.createdAt = { lt: new Date(cursor) };

  const comments = await prisma.videoComment.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
  if (comments.length > limit) {
    const next = comments.pop();
    nextCursor = next?.createdAt?.toISOString() || null;
  }

  return NextResponse.json({
    comments: comments.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      likeCount: row.likeCount,
      account: row.account,
    })),
    nextCursor,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const videoId = String(body?.videoId || "").trim();
  const content = String(body?.content || "").trim();
  const parentId = String(body?.parentId || "").trim() || null;

  if (!videoId || !content) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (content.length > 600) {
    return NextResponse.json({ error: "comment_too_long" }, { status: 400 });
  }

  const moderation = await getModerationConfig();
  const ip = getClientIpFromHeaders(request.headers);
  const hit = matchModeration(content, moderation);
  if (hit.level === "high") {
    await enforceHighRiskAction({
      userId: session.userId,
      ip,
      source: "video_comment",
      text: content,
      matches: hit.matches,
      config: moderation,
    });
    return NextResponse.json({ error: moderation.highLockMessage }, { status: 403 });
  }
  if (hit.level === "low") {
    await createLowRiskIncident({
      userId: session.userId,
      ip,
      source: "video_comment",
      text: content,
      matches: hit.matches,
    });
    return NextResponse.json({ success: true, moderatedDeleted: true });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, accountId: true, status: true },
  });
  if (!video || video.status !== "approved") {
    return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  }

  const account = await getInteractionCapableVideoAccount(session.userId);

  const latestOwnComment = await prisma.videoComment.findFirst({
    where: { videoId, accountId: account.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, body: true, createdAt: true },
  });
  if (latestOwnComment) {
    const delta = Date.now() - latestOwnComment.createdAt.getTime();
    if (delta < 10_000) {
      return NextResponse.json({ error: "comment_too_fast" }, { status: 429 });
    }
    if (delta < 5 * 60_000 && latestOwnComment.body.trim() === content) {
      return NextResponse.json({ error: "duplicate_comment" }, { status: 409 });
    }
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.videoComment.create({
      data: {
        videoId,
        accountId: account.id,
        parentId,
        body: content,
      },
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
    await tx.video.update({
      where: { id: videoId },
      data: { commentCount: { increment: 1 } },
    });
    return created;
  });

  if (video.accountId !== account.id) {
    await prisma.videoNotification.create({
      data: {
        accountId: video.accountId,
        type: "comment",
        body: "發表了新的評論",
        fromAccountId: account.id,
        videoId,
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    comment: {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      likeCount: comment.likeCount,
      account: comment.account,
    },
  });
}
