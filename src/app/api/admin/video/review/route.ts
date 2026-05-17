import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toRoleId } from "@/lib/roles";
import { notifyUserByEmail } from "@/lib/user-notifications";

async function requireStaff() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, roleId: true, name: true, email: true } });
  if (!user) return null;
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return null;
  return { user, roleId };
}

// GET /api/admin/video/review - 获取待审核视频列表
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
      { description: { contains: q } },
      { location: { contains: q } },
      { account: { is: { nickname: { contains: q } } } },
    ];
  }

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        account: {
          select: {
            id: true,
            nickname: true,
            avatarPath: true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    prisma.video.count({ where }),
  ]);

  const relatedPhotoIds = Array.from(
    new Set(
      videos
        .map((v) => {
          try {
            const info = v.aircraftInfoJson ? (JSON.parse(v.aircraftInfoJson) as any) : null;
            return typeof info?.relatedPhotoId === "string" ? info.relatedPhotoId : "";
          } catch {
            return "";
          }
        })
        .filter((v): v is string => !!v)
    )
  );
  const photos = relatedPhotoIds.length
    ? await prisma.photo.findMany({
        where: { id: { in: relatedPhotoIds }, status: "approved" },
        select: {
          id: true,
          title: true,
          registration: true,
          airline: true,
          aircraftModel: true,
          shotAirport: true,
          shotAt: true,
        },
      })
    : [];
  const photoMap = new Map(photos.map((p) => [p.id, p]));
  const enriched = videos.map((v) => {
    let relatedPhotoId = "";
    try {
      const info = v.aircraftInfoJson ? (JSON.parse(v.aircraftInfoJson) as any) : null;
      relatedPhotoId = typeof info?.relatedPhotoId === "string" ? info.relatedPhotoId : "";
    } catch {
      relatedPhotoId = "";
    }
    return {
      ...v,
      relatedPhoto: relatedPhotoId ? photoMap.get(relatedPhotoId) ?? null : null,
    };
  });

  return NextResponse.json({ videos: enriched, total, page, limit });
}

// POST /api/admin/video/review - 审核视频
export async function POST(request: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json();
  const { videoId, decision, qualityScore } = body;

  if (!videoId || !decision) {
    return NextResponse.json({ error: "videoId and decision required" }, { status: 400 });
  }

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  }

  if (qualityScore !== undefined && (qualityScore < 0 || qualityScore > 100)) {
    return NextResponse.json({ error: "qualityScore must be 0-100" }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      status: true,
      accountId: true,
      account: { select: { user: { select: { email: true } } } },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }

  if (video.status !== "pending") {
    return NextResponse.json({ error: "video already reviewed" }, { status: 400 });
  }

  // 更新视频状态
  const updateData: any = {
    status: decision,
  };

  if (qualityScore !== undefined) {
    updateData.qualityScore = qualityScore;
  }

  if (decision === "approved") {
    updateData.publishedAt = new Date();

    // 增加视频计数
    await prisma.videoAccount.update({
      where: { id: video.accountId },
      data: { videoCount: { increment: 1 } },
    });
  }

  const updated = await prisma.video.update({
    where: { id: videoId },
    data: updateData,
  });

  const ownerEmail = video.account?.user?.email;
  if (ownerEmail) {
    await notifyUserByEmail({
      email: ownerEmail,
      type: "video_review_result",
      title: decision === "approved" ? "视频审核结果：已通过" : "视频审核结果：已拒绝",
      body: decision === "approved" ? "你的投稿视频已通过审核。" : "你的投稿视频未通过审核，请修改后重试。",
      meta: { videoId, decision },
    });
  }

  return NextResponse.json({ success: true, video: updated });
}
