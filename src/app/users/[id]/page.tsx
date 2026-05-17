import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, user] = await Promise.all([
    getCurrentUser(),
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUpdatedAt: true,
        backgroundUpdatedAt: true,
        createdAt: true,
        deletedAt: true,
      },
    }),
  ]);

  if (!user || user.deletedAt) notFound();

  const [approvedCount, featuredCount, videoAccount, recentPhotos] = await Promise.all([
    prisma.photo.count({ where: { userId: id, status: "approved" } }),
    prisma.photo.count({ where: { userId: id, status: "approved", featured: true } }),
    prisma.videoAccount.findUnique({
      where: { userId: id },
      select: {
        id: true,
        nickname: true,
        followerCount: true,
        videoCount: true,
        totalViews: true,
        isPublic: true,
      },
    }),
    prisma.photo.findMany({
      where: { userId: id, status: "approved" },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        registration: true,
        aircraftModel: true,
      },
    }),
  ]);

  const displayName = (user.name || "").trim() || user.email.split("@")[0] || "User";
  const avatarUrl = user.avatarUpdatedAt ? `/api/users/${encodeURIComponent(user.id)}/avatar?v=${user.avatarUpdatedAt.getTime()}` : null;
  const backgroundUrl = user.backgroundUpdatedAt ? `/api/users/${encodeURIComponent(user.id)}/background?v=${user.backgroundUpdatedAt.getTime()}` : null;
  const isOwner = viewer?.id === user.id;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white/95 via-sky-50/70 to-white/90 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/75 dark:via-sky-950/20 dark:to-slate-900/75">
        {backgroundUrl ? (
          <img src={backgroundUrl} alt="" className="h-48 w-full object-cover" />
        ) : (
          <div className="h-48 bg-[radial-gradient(circle_at_20%_25%,rgba(14,165,233,0.22),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(244,63,94,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.9),rgba(224,242,254,0.9))] dark:bg-[radial-gradient(circle_at_20%_25%,rgba(14,165,233,0.22),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(244,63,94,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(8,47,73,0.88))]" />
        )}
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-md dark:border-slate-900 dark:bg-slate-900">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-sky-500 to-indigo-600 text-3xl font-black text-white">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{displayName}</h1>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  加入時間：{new Date(user.createdAt).toISOString().slice(0, 10)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {videoAccount?.isPublic ? (
                <Link
                  href={`/video/account/${videoAccount.id}`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  查看影片主頁
                </Link>
              ) : null}
              {isOwner ? (
                <Link
                  href="/account/profile"
                  className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400"
                >
                  編輯個人資料
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="ui-panel p-4">
          <div className="text-sm text-slate-500 dark:text-slate-300">已通過照片</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{approvedCount}</div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-sm text-slate-500 dark:text-slate-300">精選照片</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{featuredCount}</div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-sm text-slate-500 dark:text-slate-300">影片作品</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{videoAccount?.videoCount || 0}</div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-sm text-slate-500 dark:text-slate-300">影片總播放</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{videoAccount?.totalViews || 0}</div>
        </div>
      </div>

      <div className="ui-panel p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">最近通過照片</h2>
          <Link href="/photos" className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
            查看更多
          </Link>
        </div>
        {recentPhotos.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentPhotos.map((photo) => (
              <Link
                key={photo.id}
                href={`/gallery/${encodeURIComponent(photo.id)}`}
                className="rounded-2xl border border-slate-200 bg-white/85 p-4 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {photo.title || photo.registration}
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  {photo.registration} · {photo.aircraftModel}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-300">暫無公開內容。</div>
        )}
      </div>
    </div>
  );
}
