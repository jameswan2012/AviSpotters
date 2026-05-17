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

// 辅助函数：创建通知
async function createNotification(
  accountId: string,
  type: string,
  body: string,
  fromAccountId?: string
) {
  await prisma.videoNotification.create({
    data: {
      accountId,
      type,
      body,
      fromAccountId,
    },
  });
}

// POST /api/video/follow - 关注/取消关注
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { targetAccountId } = body;

  if (!targetAccountId) {
    return NextResponse.json({ error: "targetAccountId required" }, { status: 400 });
  }

  const account = await getUserVideoAccount(session.userId);
  if (!account) {
    return NextResponse.json({ error: "video account required" }, { status: 403 });
  }

  if (account.id === targetAccountId) {
    return NextResponse.json({ error: "cannot follow yourself" }, { status: 400 });
  }

  // 检查目标账号是否存在
  const targetAccount = await prisma.videoAccount.findUnique({
    where: { id: targetAccountId },
    select: { id: true },
  });
  if (!targetAccount) {
    return NextResponse.json({ error: "target account not found" }, { status: 404 });
  }

  // 检查是否已关注
  const existingFollow = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: account.id,
        followingId: targetAccountId,
      },
    },
  });

  if (existingFollow) {
    // 取消关注
    await prisma.userFollow.delete({
      where: { id: existingFollow.id },
    });

    // 更新计数
    await prisma.videoAccount.update({
      where: { id: account.id },
      data: { followingCount: { decrement: 1 } },
    });
    await prisma.videoAccount.update({
      where: { id: targetAccountId },
      data: { followerCount: { decrement: 1 } },
    });

    return NextResponse.json({ following: false });
  } else {
    // 关注
    await prisma.userFollow.create({
      data: {
        followerId: account.id,
        followingId: targetAccountId,
      },
    });

    // 更新计数
    await prisma.videoAccount.update({
      where: { id: account.id },
      data: { followingCount: { increment: 1 } },
    });
    await prisma.videoAccount.update({
      where: { id: targetAccountId },
      data: { followerCount: { increment: 1 } },
    });

    // 发送通知
    if (targetAccountId !== account.id) {
      await createNotification(
        targetAccountId,
        "follow",
        "关注了你",
        account.id
      );
    }

    return NextResponse.json({ following: true });
  }
}

// GET /api/video/follow - 获取关注列表
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type"); // followers | following
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "20");

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const where: any = {};
  if (type === "following") {
    where.followerId = accountId;
  } else {
    where.followingId = accountId;
  }

  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const follows = await prisma.userFollow.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      following: type === "following" ? {
        select: {
          id: true,
          nickname: true,
          avatarPath: true,
          avatarMime: true,
          certificationStatus: true,
          bio: true,
        },
      } : undefined,
      follower: type === "followers" ? {
        select: {
          id: true,
          nickname: true,
          avatarPath: true,
          avatarMime: true,
          certificationStatus: true,
          bio: true,
        },
      } : undefined,
    },
  });

  let nextCursor: string | null = null;
  if (follows.length > limit) {
    const next = follows.pop();
    nextCursor = next?.createdAt?.toISOString() || null;
  }

  const accounts = follows.map((f) => {
    if (type === "following") {
      return f.following;
    } else {
      return f.follower;
    }
  }).filter(Boolean);

  return NextResponse.json({ accounts, nextCursor });
}
