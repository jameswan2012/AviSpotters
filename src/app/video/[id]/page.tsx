import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import VideoPage from "@/components/video/VideoPage";
import { getSession } from "@/lib/auth";

function parseAircraftInfo(json: string | null) {
  if (!json) return {};
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      account: {
        select: {
          id: true,
          nickname: true,
          avatarPath: true,
          avatarMime: true,
          certificationStatus: true,
          certificationScore: true,
          userId: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true,
          favorites: true,
        },
      },
    },
  });

  if (!video || video.status !== "approved" || video.visibility !== "public") {
    notFound();
  }

  const aircraftInfo = parseAircraftInfo(video.aircraftInfoJson);
  const relatedPhotoId = typeof aircraftInfo.relatedPhotoId === "string" ? aircraftInfo.relatedPhotoId : "";
  const relatedPhoto = relatedPhotoId
    ? await prisma.photo.findFirst({
        where: { id: relatedPhotoId, status: "approved" },
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
    : null;

  let isLiked = false;
  let isFollowing = false;
  let isFavorited = false;

  if (session) {
    const [videoAccount, like, follow, favorite] = await Promise.all([
      prisma.videoAccount.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      }),
      prisma.videoLike.findFirst({
        where: {
          videoId: id,
          account: { userId: session.userId },
        },
      }),
      prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId:
              (await prisma.videoAccount.findUnique({
                where: { userId: session.userId },
                select: { id: true },
              }))?.id || "",
            followingId: video.account.id,
          },
        },
      }).catch(() => null),
      prisma.videoFavorite.findFirst({
        where: {
          videoId: id,
          account: { userId: session.userId },
        },
      }),
    ]);

    isLiked = !!like;
    isFollowing = !!follow;
    isFavorited = !!favorite;
  }

  const nextViewCount = (video.viewCount || 0) + 1;
  await prisma.video.update({
    where: { id },
    data: { viewCount: nextViewCount },
  });

  const canModify =
    !!session &&
    video.account.userId === session.userId &&
    !video.descriptionModified &&
    video.status === "approved";

  const safeVideo = {
    id: video.id,
    type: video.type as "video" | "image",
    description: video.description,
    location: video.location || "",
    thumbnailPath: video.thumbnailPath || undefined,
    videoPath: video.videoPath || undefined,
    imagePathsJson: video.imagePathsJson || undefined,
    viewCount: nextViewCount,
    likeCount: video._count.likes,
    commentCount: video._count.comments,
    shareCount: video._count.shares,
    favoriteCount: video._count.favorites,
    account: {
      id: video.account.id,
      nickname: video.account.nickname,
      avatarPath: video.account.avatarPath || undefined,
      avatarMime: video.account.avatarMime || undefined,
      certificationStatus: video.account.certificationStatus,
      certificationScore: video.account.certificationScore,
    },
    createdAt: video.createdAt.toISOString(),
    relatedPhoto: relatedPhoto
      ? {
          id: relatedPhoto.id,
          title: relatedPhoto.title,
          registration: relatedPhoto.registration,
          airline: relatedPhoto.airline,
          aircraftModel: relatedPhoto.aircraftModel,
          shotAirport: relatedPhoto.shotAirport,
          shotAt: String(relatedPhoto.shotAt),
        }
      : null,
    isLiked,
    isFollowing,
    isFavorited,
    isOwner: !!session && video.account.userId === session.userId,
    canModify,
  };

  return <VideoPage video={safeVideo as any} />;
}
