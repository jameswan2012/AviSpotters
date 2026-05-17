import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

function canModifyVideo(createdAt: Date, descriptionModified: boolean): boolean {
  if (descriptionModified) return false;
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return createdAt > threeMonthsAgo;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await prisma.videoAccount.findUnique({
    where: { userId: session.userId },
    select: { id: true, nickname: true },
  });
  if (!account) return NextResponse.json({ error: "video account required" }, { status: 403 });

  const videos = await prisma.video.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      description: true,
      status: true,
      location: true,
      thumbnailPath: true,
      imagePathsJson: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      favoriteCount: true,
      qualityScore: true,
      createdAt: true,
      descriptionModified: true,
      publishedAt: true,
    },
  });

  const totals = videos.reduce(
    (acc, v) => {
      acc.total += 1;
      if (v.status === "pending") acc.pending += 1;
      if (v.status === "approved") acc.approved += 1;
      if (v.status === "rejected") acc.rejected += 1;
      acc.views += v.viewCount;
      acc.likes += v.likeCount;
      acc.comments += v.commentCount;
      acc.shares += v.shareCount;
      acc.favorites += v.favoriteCount;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0, views: 0, likes: 0, comments: 0, shares: 0, favorites: 0 }
  );

  const mapped = videos.map((v) => ({
    ...v,
    canModify: canModifyVideo(v.createdAt, v.descriptionModified),
  }));

  return NextResponse.json({ account, totals, videos: mapped });
}

