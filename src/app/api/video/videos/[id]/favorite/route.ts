import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// 辅助函数：获取用户的视频账号
async function getUserVideoAccount(userId: string) {
  return prisma.videoAccount.findUnique({
    where: { userId },
    select: { id: true },
  });
}

// POST /api/video/videos/[id]/favorite - 收藏/取消收藏
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: videoId } = await params;
  const account = await getUserVideoAccount(session.userId);
  if (!account) {
    return NextResponse.json({ error: "video account required" }, { status: 403 });
  }

  // 检查视频是否存在
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, accountId: true },
  });
  if (!video) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }

  // 检查是否已收藏
  const existingFavorite = await prisma.videoFavorite.findUnique({
    where: {
      videoId_accountId: {
        videoId,
        accountId: account.id,
      },
    },
  });

  if (existingFavorite) {
    // 取消收藏
    await prisma.videoFavorite.delete({
      where: { id: existingFavorite.id },
    });

    // 更新计数
    await prisma.video.update({
      where: { id: videoId },
      data: { favoriteCount: { decrement: 1 } },
    });

    return NextResponse.json({ favorited: false });
  } else {
    // 收藏
    await prisma.videoFavorite.create({
      data: {
        videoId,
        accountId: account.id,
      },
    });

    // 更新计数
    await prisma.video.update({
      where: { id: videoId },
      data: { favoriteCount: { increment: 1 } },
    });

    return NextResponse.json({ favorited: true });
  }
}
