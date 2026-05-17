import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toRoleId } from "@/lib/roles";

async function requireStaff() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, roleId: true, name: true, email: true } });
  if (!user) return null;
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return null;
  return { user, roleId };
}

// GET /api/admin/video/certification - 获取认证申请列表
export async function GET(request: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "pending").trim();
  const q = (searchParams.get("q") ?? "").trim();
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = { status };
  if (q) {
    where.OR = [
      { account: { is: { nickname: { contains: q } } } },
      { account: { is: { user: { is: { email: { contains: q } } } } } },
    ];
  }

  const [certifications, total] = await Promise.all([
    prisma.videoCertification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        account: {
          select: {
            id: true,
            nickname: true,
            avatarPath: true,
            certificationScore: true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    prisma.videoCertification.count({ where }),
  ]);

  return NextResponse.json({ certifications, total, page, limit });
}

// POST /api/admin/video/certification - 审核认证申请
export async function POST(request: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json();
  const { certificationId, decision, rejectReason } = body;

  if (!certificationId || !decision) {
    return NextResponse.json({ error: "certificationId and decision required" }, { status: 400 });
  }

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  }

  const certification = await prisma.videoCertification.findUnique({
    where: { id: certificationId },
    select: { id: true, status: true, type: true, accountId: true },
  });

  if (!certification) {
    return NextResponse.json({ error: "certification not found" }, { status: 404 });
  }

  if (certification.status !== "pending") {
    return NextResponse.json({ error: "certification already reviewed" }, { status: 400 });
  }

  // 计算分数加成
  let scoreBonus = 0;
  if (decision === "approved") {
    if (certification.type === "white") {
      scoreBonus = 10;
    } else if (certification.type === "yellow") {
      scoreBonus = 30;
    }
  }

  // 更新认证状态
  const updated = await prisma.videoCertification.update({
    where: { id: certificationId },
    data: {
      status: decision,
      rejectReason: decision === "rejected" ? rejectReason : null,
      reviewedById: staff.user.id,
      reviewedAt: new Date(),
      scoreBonus,
    },
  });

  // 更新账号的认证状态和分数
  if (decision === "approved") {
    const newStatus = certification.type;
    await prisma.videoAccount.update({
      where: { id: certification.accountId },
      data: {
        certificationStatus: newStatus,
        certificationScore: { increment: scoreBonus },
      },
    });
  } else if (decision === "rejected") {
    // 检查是否是恶意申请（第1次警告，第2次封禁7天，第3次注销账号）
    const rejectCount = await prisma.videoCertification.count({
      where: {
        accountId: certification.accountId,
        status: "rejected",
      },
    });

    if (rejectCount >= 2) {
      // 第3次拒绝，注销账号
      await prisma.videoAccount.delete({
        where: { id: certification.accountId },
      });
    } else if (rejectCount >= 1) {
      // 第2次拒绝，封禁7天
      await prisma.videoAccount.update({
        where: { id: certification.accountId },
        data: {
          certificationWarnings: { increment: 1 },
          certificationBannedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      // 第1次拒绝，仅警告
      await prisma.videoAccount.update({
        where: { id: certification.accountId },
        data: {
          certificationWarnings: { increment: 1 },
        },
      });
    }
  }

  return NextResponse.json({ success: true, certification: updated });
}
