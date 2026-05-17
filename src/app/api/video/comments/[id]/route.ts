import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// 辅助函数：获取用户的视频账号
async function getUserVideoAccount(userId: string) {
  return prisma.videoAccount.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
}

// DELETE /api/video/comments/[id] - 删除评论
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const account = await getUserVideoAccount(session.userId);
  if (!account) {
    return NextResponse.json({ error: "video account required" }, { status: 403 });
  }

  // 检查评论是否存在
  const comment = await prisma.videoComment.findUnique({
    where: { id },
    select: { id: true, accountId: true, videoId: true, parentId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "comment not found" }, { status: 404 });
  }

  // 检查是否是评论所有者或视频所有者
  const isCommentOwner = comment.accountId === account.id;
  const video = await prisma.video.findUnique({
    where: { id: comment.videoId },
    select: { accountId: true },
  });
  const isVideoOwner = video?.accountId === account.id;

  if (!isCommentOwner && !isVideoOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 删除评论及其所有回复
  await prisma.videoComment.deleteMany({
    where: { id: comment.id },
  });

  // 如果是主评论，删除所有回复
  if (!comment.parentId) {
    await prisma.videoComment.deleteMany({
      where: { parentId: comment.id },
    });
  }

  // 更新评论计数
  const deleteCount = isCommentOwner ? 1 : (await prisma.videoComment.count({ where: { parentId: comment.id } })) + 1;
  await prisma.video.update({
    where: { id: comment.videoId },
    data: { commentCount: { decrement: deleteCount } },
  });

  return NextResponse.json({ success: true });
}

// POST /api/video/comments/[id]/like - 点赞/取消点赞评论
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const account = await getUserVideoAccount(session.userId);
  if (!account) {
    return NextResponse.json({ error: "video account required" }, { status: 403 });
  }

  // 检查评论是否存在
  const comment = await prisma.videoComment.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "comment not found" }, { status: 404 });
  }

  // 检查是否已点赞
  const existingLike = await prisma.videoLike.findUnique({
    where: {
      commentId_accountId: {
        commentId: id,
        accountId: account.id,
      },
    },
  });

  if (existingLike) {
    // 取消点赞
    await prisma.videoLike.delete({
      where: { id: existingLike.id },
    });
    await prisma.videoComment.update({
      where: { id },
      data: { likeCount: { decrement: 1 } },
    });
    return NextResponse.json({ liked: false });
  } else {
    // 点赞
    await prisma.videoLike.create({
      data: {
        commentId: id,
        accountId: account.id,
      },
    });
    await prisma.videoComment.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
    });
    return NextResponse.json({ liked: true });
  }
}
