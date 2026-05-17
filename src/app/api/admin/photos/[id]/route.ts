import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toRoleId } from "@/lib/roles";
import { notifyUserById } from "@/lib/user-notifications";

async function requireStaff() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, roleId: true, name: true, email: true },
  });
  if (!user) return null;
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return null;
  return { user, roleId };
}

function normalizeReason(text: string) {
  return text
    .split(/、|\n|，|,|;|；/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isGenericRejectReason(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < 4) return true;
  const normalized = trimmed.replace(/\s+/g, "");
  const genericSet = new Set([
    "圖片不符合要求",
    "图片不符合要求",
    "不符合要求",
    "不通过",
    "未通过",
    "未通過",
    "不合格",
    "非法圖片",
    "非法图片",
  ]);
  if (genericSet.has(normalized)) return true;
  const reasons = normalizeReason(trimmed);
  return reasons.length === 1 && genericSet.has(reasons[0] || "");
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    staffNote?: string;
    reviewReason?: string;
    approveNote?: string;
    featured?: boolean;
    hot?: boolean;
    forceRejectConfirm?: boolean;
  };

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      firstReviewedById: true,
      assignedReviewerId: true,
    },
  });
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const action = String(body.action || "").trim();
  const staffNote = typeof body.staffNote === "string" ? body.staffNote.trim() || null : null;
  const canFeature = staff.roleId >= 4;
  const canHot = staff.roleId >= 4;

  if (action === "assignToMe") {
    if (photo.status !== "pending") return NextResponse.json({ error: "photo already reviewed" }, { status: 400 });
    await prisma.photo.update({
      where: { id },
      data: { assignedReviewerId: staff.user.id },
      select: { id: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "transfer") {
    await prisma.photo.update({
      where: { id },
      data: { assignedReviewerId: null, staffNote },
      select: { id: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve" || action === "reject") {
    if (photo.status !== "pending") return NextResponse.json({ error: "photo already reviewed" }, { status: 400 });

    const publicNote =
      action === "approve"
        ? typeof body.approveNote === "string"
          ? body.approveNote.trim() || null
          : null
        : typeof body.reviewReason === "string"
          ? body.reviewReason.trim()
          : "";

    if (action === "reject" && !publicNote) {
      return NextResponse.json({ error: "請填寫拒絕原因" }, { status: 400 });
    }
    if (action === "reject" && isGenericRejectReason(publicNote) && !body.forceRejectConfirm) {
      return NextResponse.json(
        {
          error: "reject_reason_too_generic",
          warning: "拒絕留言過於籠統。若仍要提交，系統會通知管理員。",
          requireConfirm: true,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const decision = action === "approve" ? "approved" : "rejected";
    await prisma.photo.update({
      where: { id },
      data: {
        status: decision,
        assignedReviewerId: null,
        staffNote,
        reviewDecision: decision,
        reviewReason: publicNote || null,
        reviewedById: staff.user.id,
        reviewedAt: now,
        featured: decision === "approved" ? (canFeature ? !!body.featured : false) : false,
        hot: decision === "approved" ? (canHot ? !!body.hot : false) : false,
        reReviewRequestedAt: null,
        reReviewRequestedById: null,
        reReviewReason: null,
        ...(photo.firstReviewedById
          ? {}
          : {
              firstReviewedById: staff.user.id,
              firstReviewedAt: now,
              firstReviewDecision: decision,
              firstReviewReason: publicNote || null,
            }),
      },
      select: { id: true },
    });

    await notifyUserById({
      userId: photo.userId,
      title: decision === "approved" ? "照片審核結果：已通過" : "照片審核結果：已拒絕",
      body:
        decision === "approved"
          ? publicNote || "你的照片已通過審核。"
          : publicNote || "你的照片未通過審核，請按留言修改後重新提交。",
      type: "photo_review_result",
      meta: { photoId: id, decision },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  }

  await prisma.photo.update({
    where: { id },
    data: {
      staffNote,
      ...(canFeature ? { featured: !!body.featured } : {}),
      ...(canHot ? { hot: !!body.hot } : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
