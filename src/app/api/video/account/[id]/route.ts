import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { isNicknameTaken, normalizeNickname, validateNicknameFormat } from "@/lib/nickname";
import { getClientIpFromHeaders } from "@/lib/ip";
import { createLowRiskIncident, enforceHighRiskAction, getModerationConfig, matchModeration } from "@/lib/moderation";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

// 辅助函数：验证是否是账号所有者
async function requireAccountOwner(accountId: string, userId: string) {
  const account = await prisma.videoAccount.findUnique({
    where: { id: accountId },
    select: { userId: true },
  });
  return account?.userId === userId;
}

// GET /api/video/account/[id] - 获取指定视频账号公开信息
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const viewerUserId = searchParams.get("viewerUserId"); // 可选的查看者

  const account = await prisma.videoAccount.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          videos: { where: { status: "approved" } },
          followers: true,
        },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 检查可见性权限
  let canView = true;
  if (!account.isPublic) {
    // 非公开账号，需要检查是否有关注关系
    if (viewerUserId && viewerUserId !== account.userId) {
      const viewerAccount = await prisma.videoAccount.findUnique({
        where: { userId: viewerUserId },
      });
      if (viewerAccount) {
        const follow = await prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerAccount.id,
              followingId: account.id,
            },
          },
        });
        canView = !!follow;
      } else {
        canView = false;
      }
    } else {
      canView = false;
    }
  }

  if (!canView) {
    return NextResponse.json({ error: "private account" }, { status: 403 });
  }

  return NextResponse.json({
    account: {
      id: account.id,
      userId: account.userId,
      nickname: account.nickname,
      avatarPath: account.avatarPath,
      avatarMime: account.avatarMime,
      bio: account.bio,
      region: account.region,
      gender: account.gender,
      isPublic: account.isPublic,
      videoCount: account._count.videos,
      followerCount: account._count.followers,
      totalViews: account.totalViews,
      totalLikes: account.totalLikes,
      certificationStatus: account.certificationStatus,
      certificationScore: account.certificationScore,
      createdAt: account.createdAt,
      user: account.user,
    },
  });
}

// PUT /api/video/account/[id] - 更新视频账号信息
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const isOwner = await requireAccountOwner(id, session.userId);
  if (!isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const nickname = formData.get("nickname") as string;
  const region = formData.get("region") as string;
  const gender = formData.get("gender") as string;
  const bio = formData.get("bio") as string;
  const isPublic = formData.get("isPublic");
  const avatar = formData.get("avatar") as File | null;

  const account = await prisma.videoAccount.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 处理头像上传
  let avatarPath = account.avatarPath;
  let avatarMime = account.avatarMime;
  if (avatar && avatar.size > 0) {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(avatar.type)) {
      return NextResponse.json({ error: "avatar must be jpg or png" }, { status: 400 });
    }
    if (avatar.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "avatar must be less than 15MB" }, { status: 400 });
    }

    const bytes = await avatar.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = avatar.type === "image/jpeg" ? "jpg" : "png";
    const filename = `video-avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filepath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filepath, buffer);

    // 删除旧头像
    if (account.avatarPath) {
      try {
        await fs.unlink(path.join(UPLOAD_DIR, account.avatarPath));
      } catch {}
    }

    avatarPath = filename;
    avatarMime = avatar.type;
  }

  // 更新数据
  const updateData: any = {};

  const moderation = await getModerationConfig();
  const ip = getClientIpFromHeaders(request.headers);

  if (nickname !== undefined) {
    const normalizedNickname = normalizeNickname(nickname);
    const fmt = validateNicknameFormat(normalizedNickname);
    if (!fmt.ok) return NextResponse.json({ error: "nickname_invalid" }, { status: 400 });
    const taken = await isNicknameTaken(normalizedNickname, { excludeVideoAccountId: id, excludeUserId: session.userId });
    if (taken) return NextResponse.json({ error: "nickname_already_taken" }, { status: 409 });
    updateData.nickname = normalizedNickname;
  }

  const contentText = [
    updateData.nickname ?? account.nickname ?? "",
    region ?? account.region ?? "",
    bio ?? account.bio ?? "",
  ]
    .map((x) => String(x ?? ""))
    .join("\n");
  const hit = matchModeration(contentText, moderation);
  if (hit.level === "high") {
    await enforceHighRiskAction({
      userId: session.userId,
      ip,
      source: "video_account_update",
      text: contentText,
      matches: hit.matches,
      config: moderation,
    });
    return NextResponse.json({ error: moderation.highLockMessage }, { status: 403 });
  }
  if (hit.level === "low") {
    await createLowRiskIncident({
      userId: session.userId,
      ip,
      source: "video_account_update",
      text: contentText,
      matches: hit.matches,
    });
    updateData.bio = null;
  }

  if (region !== undefined) updateData.region = region?.trim() || null;
  if (gender !== undefined) updateData.gender = gender || null;
  if (bio !== undefined) updateData.bio = bio?.trim() || null;
  if (typeof isPublic === "string") updateData.isPublic = isPublic === "true";
  if (avatar && avatar.size > 0) {
    updateData.avatarPath = avatarPath;
    updateData.avatarMime = avatarMime;
  }

  const updated = await prisma.videoAccount.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
