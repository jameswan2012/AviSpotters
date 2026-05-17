import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getInteractionCapableVideoAccount } from "@/lib/video-account";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: videoId } = await params;
  const account = await getInteractionCapableVideoAccount(session.userId);

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, accountId: true },
  });
  if (!video) {
    return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  }

  const existingLike = await prisma.videoLike.findUnique({
    where: {
      videoId_accountId: {
        videoId,
        accountId: account.id,
      },
    },
  });

  if (existingLike) {
    await prisma.$transaction(async (tx) => {
      await tx.videoLike.delete({ where: { id: existingLike.id } });
      await tx.video.update({
        where: { id: videoId },
        data: { likeCount: { decrement: 1 } },
      });
    });
    const refreshed = await prisma.video.findUnique({
      where: { id: videoId },
      select: { likeCount: true },
    });
    return NextResponse.json({ success: true, liked: false, likeCount: refreshed?.likeCount ?? 0 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.videoLike.create({
      data: {
        videoId,
        accountId: account.id,
      },
    });
    await tx.video.update({
      where: { id: videoId },
      data: { likeCount: { increment: 1 } },
    });
    if (video.accountId !== account.id) {
      await tx.videoNotification.create({
        data: {
          accountId: video.accountId,
          type: "like",
          body: "推薦了你的作品",
          fromAccountId: account.id,
          videoId,
        },
      }).catch(() => {});
    }
  });

  const refreshed = await prisma.video.findUnique({
    where: { id: videoId },
    select: { likeCount: true },
  });
  return NextResponse.json({ success: true, liked: true, likeCount: refreshed?.likeCount ?? 0 });
}
