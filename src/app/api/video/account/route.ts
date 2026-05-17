import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { isNicknameTaken, normalizeNickname, validateNicknameFormat } from "@/lib/nickname";
import { getClientIpFromHeaders } from "@/lib/ip";
import { createLowRiskIncident, enforceHighRiskAction, getModerationConfig, matchModeration } from "@/lib/moderation";
import { isInteractionOnlyAccount } from "@/lib/video-account";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function getVideoAccount(userId: string) {
  return prisma.videoAccount.findUnique({
    where: { userId },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await getVideoAccount(session.userId);
  if (account && !isInteractionOnlyAccount(account)) {
    return NextResponse.json({
      hasAccount: true,
      account: {
        id: account.id,
        nickname: account.nickname,
        region: account.region,
        gender: account.gender,
        bio: account.bio,
        isPublic: account.isPublic,
        avatarPath: account.avatarPath,
        avatarMime: account.avatarMime,
        certificationStatus: account.certificationStatus,
        certificationScore: account.certificationScore,
      },
    });
  }

  const approvedPhotoCount = await prisma.photo.count({
    where: { userId: session.userId, status: "approved" },
  });

  return NextResponse.json({
    hasAccount: false,
    approvedPhotoCount,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const nickname = String(formData.get("nickname") || "");
  const region = String(formData.get("region") || "");
  const gender = String(formData.get("gender") || "");
  const bio = String(formData.get("bio") || "");
  const avatar = formData.get("avatar") as File | null;

  const existingAccount = await getVideoAccount(session.userId);
  if (existingAccount && !isInteractionOnlyAccount(existingAccount)) {
    return NextResponse.json({ error: "account_already_exists" }, { status: 409 });
  }

  const approvedPhotoCount = await prisma.photo.count({
    where: { userId: session.userId, status: "approved" },
  });
  if (approvedPhotoCount < 10) {
    return NextResponse.json({ error: "approved_photos_required" }, { status: 403 });
  }

  const normalizedNickname = normalizeNickname(nickname);
  const fmt = validateNicknameFormat(normalizedNickname);
  if (!fmt.ok) return NextResponse.json({ error: fmt.error || "nickname_invalid" }, { status: 400 });
  if (await isNicknameTaken(normalizedNickname, { excludeUserId: session.userId, excludeVideoAccountId: existingAccount?.id })) {
    return NextResponse.json({ error: "nickname_already_taken" }, { status: 409 });
  }

  const moderation = await getModerationConfig();
  const ip = getClientIpFromHeaders(request.headers);
  const contentText = [normalizedNickname, region, bio].join("\n");
  const hit = matchModeration(contentText, moderation);
  if (hit.level === "high") {
    await enforceHighRiskAction({
      userId: session.userId,
      ip,
      source: "video_account_create",
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
      source: "video_account_create",
      text: contentText,
      matches: hit.matches,
    });
  }

  let avatarPath: string | null = existingAccount?.avatarPath || null;
  let avatarMime: string | null = existingAccount?.avatarMime || null;
  if (avatar && avatar.size > 0) {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(avatar.type)) {
      return NextResponse.json({ error: "avatar_must_be_jpg_or_png" }, { status: 400 });
    }
    if (avatar.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "avatar_too_large" }, { status: 400 });
    }
    const ext = avatar.type === "image/png" ? "png" : "jpg";
    const filename = `video-avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await avatar.arrayBuffer());
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
    avatarPath = filename;
    avatarMime = avatar.type;
  }

  const data = {
    userId: session.userId,
    nickname: normalizedNickname,
    region: region.trim() || null,
    gender: gender.trim() || null,
    bio: hit.level === "low" ? null : bio.trim() || null,
    isPublic: true,
    avatarPath,
    avatarMime,
  };

  const account = existingAccount
    ? await prisma.videoAccount.update({
        where: { id: existingAccount.id },
        data,
      })
    : await prisma.videoAccount.create({
        data,
      });

  return NextResponse.json({ success: true, accountId: account.id });
}
