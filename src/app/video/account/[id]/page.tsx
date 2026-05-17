import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import Link from "next/link";
import Image from "next/image";

function toVideoAssetUrl(raw?: string | null) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const p = s.replaceAll("\\", "/");
  const m =
    p.match(/\/uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
    p.match(/^uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
    p.match(/^\/?videos\/(.+)$/i);
  const normalized = m?.[1] || p.split("/").filter(Boolean).pop();
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `/api/video/stream/${normalized}`;
}

export default async function VideoAccountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab || "videos";
  const currentUser = await getCurrentUser();

  // 获取视频账号信息
  const account = await prisma.videoAccount.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">视频账号不存在</p>
          <Link href="/video" className="mt-4 text-blue-500 hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  // 获取视频列表
  const videos = await prisma.video.findMany({
    where: {
      accountId: id,
      status: "approved",
      ...(tab === "videos" ? {} : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      thumbnailPath: true,
      imagePathsJson: true,
      viewCount: true,
      likeCount: true,
    },
  });

  // 获取粉丝和关注数
  const [followerCount, followingCount] = await Promise.all([
    prisma.userFollow.count({ where: { followingId: id } }),
    prisma.userFollow.count({ where: { followerId: id } }),
  ]);

  // 检查当前用户是否已关注
  let isFollowing = false;
  if (currentUser) {
    const currentAccount = await prisma.videoAccount.findUnique({
      where: { userId: currentUser.id },
    });
    if (currentAccount) {
      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentAccount.id,
            followingId: id,
          },
        },
      });
      isFollowing = !!follow;
    }
  }

  const isOwner = currentUser?.id === account.userId;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* 头部背景 */}
      <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600"></div>

      <div className="mx-auto max-w-4xl px-4">
        {/* 用户信息 */}
        <div className="-mt-16 mb-6">
          <div className="flex flex-col items-center">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white dark:border-slate-800">
              {account.avatarPath ? (
                <Image
                  src={`/uploads/${account.avatarPath}`}
                  alt={account.nickname}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-300 text-4xl font-bold text-slate-600">
                  {account.nickname.charAt(0)}
                </div>
              )}
            </div>

            <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold">
              {account.nickname}
              {account.certificationStatus === "white" && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                  <svg className="h-4 w-4 fill-black" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </span>
              )}
              {account.certificationStatus === "yellow" && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500">
                  <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </span>
              )}
            </h1>

            {account.bio && <p className="mt-2 text-center text-slate-600 dark:text-slate-300">{account.bio}</p>}

            {account.region && (
              <p className="mt-1 text-sm text-slate-500">
                📍 {account.region}
              </p>
            )}

            {/* 统计 */}
            <div className="mt-4 flex gap-8">
              <div className="text-center">
                <p className="text-xl font-bold">{account.videoCount}</p>
                <p className="text-sm text-slate-500">作品</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{followerCount}</p>
                <p className="text-sm text-slate-500">粉丝</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{followingCount}</p>
                <p className="text-sm text-slate-500">关注</p>
              </div>
            </div>

            {/* 操作按钮 */}
            {!isOwner && (
              <form action="/api/video/follow" method="POST" className="mt-4">
                <input type="hidden" name="targetAccountId" value={id} />
                <button
                  type="submit"
                  className={`rounded-full px-8 py-2 font-medium ${
                    isFollowing
                      ? "border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  {isFollowing ? "已关注" : "关注"}
                </button>
              </form>
            )}

            {isOwner && (
              <div className="mt-4 flex gap-2">
                <Link
                  href="/video/account/edit"
                  className="rounded-full border border-slate-300 px-6 py-2 font-medium dark:border-slate-600 dark:text-slate-300"
                >
                  编辑资料
                </Link>
                <Link
                  href="/video/account/manage"
                  className="rounded-full bg-sky-500 px-6 py-2 font-medium text-white hover:bg-sky-400"
                >
                  作品管理面板
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <Link
            href={`/video/account/${id}?tab=videos`}
            className={`flex-1 py-3 text-center font-medium ${
              tab === "videos"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-slate-500"
            }`}
          >
            作品
          </Link>
          <Link
            href={`/video/account/${id}?tab=likes`}
            className={`flex-1 py-3 text-center font-medium ${
              tab === "likes"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-slate-500"
            }`}
          >
            点赞
          </Link>
        </div>

        {/* 视频网格 */}
        <div className="py-6">
          {videos.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              暂无视频
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {videos.map((video) => (
                <Link key={video.id} href={`/video/${video.id}`}>
                  <div className="relative aspect-[3/4] bg-slate-200">
                    {video.type === "video" ? (
                      video.thumbnailPath ? (
                        <Image
                          src={toVideoAssetUrl(video.thumbnailPath) || "/placeholder.svg"}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-8 w-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )
                    ) : (
                      (() => {
                        try {
                          const images = JSON.parse(video.imagePathsJson || "[]");
                          return images[0] ? (
                            <Image
                              src={toVideoAssetUrl(images[0]) || "/placeholder.svg"}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          ) : null;
                        } catch {
                          return null;
                        }
                      })()
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <div className="flex items-center gap-1 text-xs text-white">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        {video.viewCount}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
