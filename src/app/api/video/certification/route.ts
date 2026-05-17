import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// 辅助函数：获取用户的视频账号
async function getUserVideoAccount(userId: string) {
  return prisma.videoAccount.findUnique({
    where: { userId },
    select: { id: true, certificationStatus: true, certificationBannedUntil: true, certificationWarnings: true },
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

// POST /api/video/certification - 申请认证
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await getUserVideoAccount(session.userId);
  if (!account) {
    return NextResponse.json({ error: "video account required" }, { status: 403 });
  }

  // 检查是否在封禁期
  if (account.certificationBannedUntil && account.certificationBannedUntil > new Date()) {
    return NextResponse.json({ error: "certification banned until " + account.certificationBannedUntil.toISOString() }, { status: 400 });
  }

  // 检查当前认证状态
  if (account.certificationStatus === "white" || account.certificationStatus === "yellow") {
    return NextResponse.json({ error: "already certified" }, { status: 400 });
  }

  const body = await request.json();
  const { type } = body;

  // 验证类型：white | yellow
  if (type !== "white" && type !== "yellow") {
    return NextResponse.json({ error: "type must be white or yellow" }, { status: 400 });
  }

  // 黄色认证需要先有白色认证
  if (type === "yellow" && account.certificationStatus !== "white") {
    return NextResponse.json({ error: "must have white certification first" }, { status: 400 });
  }

  // 检查是否有待处理的申请
  const pendingCert = await prisma.videoCertification.findFirst({
    where: {
      accountId: account.id,
      status: "pending",
    },
  });
  if (pendingCert) {
    return NextResponse.json({ error: "already has pending certification" }, { status: 400 });
  }

  // 创建认证申请
  const certification = await prisma.videoCertification.create({
    data: {
      accountId: account.id,
      type,
      status: "pending",
    },
  });

  return NextResponse.json({ success: true, certification });
}

// GET /api/video/certification - 获取当前用户的认证申请状态
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await getUserVideoAccount(session.userId);
  if (!account) {
    return NextResponse.json({ error: "video account required" }, { status: 403 });
  }

  const certifications = await prisma.videoCertification.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ certifications });
}
