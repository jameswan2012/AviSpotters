import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const reviewerPlusRoleId = 2;
  const onlineCutoff = new Date(now.getTime() - 10 * 60 * 1000);

  const topicIds = [
    "special_livery",
    "airport",
    "cabin",
    "cockpit",
    "night_shot",
    "airshow",
    "special_plane",
  ];

  const [users, approved, pending, reviewerTotal, activeReviewers, activeReviewerList, reviewedTodayApproved, reviewedTodayRejected, latest, hotToday, topicPhotos] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.photo.count({ where: { status: "approved" } }),
    prisma.photo.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { deletedAt: null, roleId: { gte: reviewerPlusRoleId } } }),
    prisma.user.count({ where: { deletedAt: null, roleId: { gte: reviewerPlusRoleId }, lastSeenAt: { gte: onlineCutoff } } }),
    prisma.user.findMany({
      where: { deletedAt: null, roleId: { gte: reviewerPlusRoleId }, lastSeenAt: { gte: onlineCutoff } },
      orderBy: [{ lastSeenAt: "desc" }, { roleId: "desc" }],
      take: 8,
      select: { id: true, name: true, email: true, roleId: true },
    }),
    prisma.photo.count({ where: { status: "approved", reviewedAt: { gte: start, lte: end } } }),
    prisma.photo.count({ where: { status: "rejected", reviewedAt: { gte: start, lte: end } } }),
    prisma.photo.findMany({
      where: { status: "approved" },
      orderBy: [{ createdAt: "desc" }],
      take: 24,
      select: {
        id: true,
        title: true,
        registration: true,
        airline: true,
        aircraftModel: true,
        shotAirport: true,
        status: true,
        hot: true,
      },
    }),
    prisma.photo.findMany({
      where: { status: "approved", createdAt: { gte: start, lte: end } },
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        registration: true,
        airline: true,
        aircraftModel: true,
        shotAirport: true,
        status: true,
        hot: true,
      },
    }),
    Promise.all(
      topicIds.map(async (topicId) => {
        const photos = await prisma.photo.findMany({
          where: { status: "approved", categoriesJson: { contains: `"${topicId}"` } },
          orderBy: [{ createdAt: "desc" }],
          take: 4,
          select: {
            id: true,
            title: true,
            registration: true,
            airline: true,
            aircraftModel: true,
            shotAirport: true,
            status: true,
            hot: true,
          },
        });
        return { topicId, photos };
      })
    ),
  ]);

  const reviewedToday = reviewedTodayApproved + reviewedTodayRejected;
  const passRateToday = reviewedToday ? Math.round((reviewedTodayApproved / reviewedToday) * 100) : null;

  return NextResponse.json({
    stats: {
      users,
      approved,
      pending,
      reviewerTotal,
      activeReviewers,
      passRateToday,
      activeReviewerList: activeReviewerList.map((u) => ({
        id: u.id,
        name: (u.name ?? u.email) || u.email,
        roleId: u.roleId,
      })),
    },
    topics: topicPhotos,
    hotToday,
    latest,
  });
}
