import { prisma } from "@/lib/db";
import VideoFeed from "@/components/video/VideoFeed";
import Link from "next/link";
import { getServerLocaleOnly } from "@/i18n/server";
import { getCurrentUser } from "@/lib/current-user";
import { INTERACTION_ACCOUNT_PREFIX } from "@/lib/video-account";

export default async function VideoIndexPage({ searchParams }: { searchParams: Promise<{ filter?: string; cursor?: string; category?: string }> }) {
  const sp = await searchParams;
  const cursor = sp.cursor;
  const filter = sp.filter || "recommended";
  const category = sp.category || "all";
  const user = await getCurrentUser();
  const locale = await getServerLocaleOnly();

  const [hotVideos, categoryVideos, myVideoAccount] = await Promise.all([
    prisma.video.findMany({
      where: { status: "approved", visibility: "public", publishedAt: { not: null } },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: {
        account: { select: { id: true, nickname: true, avatarPath: true, avatarMime: true } },
      },
    }),
    category === "all" ? Promise.resolve([]) : prisma.video.findMany({
      where: { status: "approved", visibility: "public", publishedAt: { not: null } },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
      include: {
        account: { select: { id: true, nickname: true, avatarPath: true, avatarMime: true } },
      },
    }),
    user
      ? prisma.videoAccount.findUnique({
          where: { userId: user.id },
          select: { id: true, nickname: true },
        })
      : Promise.resolve(null),
  ]);
  const realVideoAccount =
    myVideoAccount && !String(myVideoAccount.nickname || "").startsWith(INTERACTION_ACCOUNT_PREFIX)
      ? myVideoAccount
      : null;

  const [totalVideos, totalAccounts, totalViews] = await Promise.all([
    prisma.video.count({ where: { status: "approved", visibility: "public" } }),
    prisma.videoAccount.count({ where: { isPublic: true } }),
    prisma.video.aggregate({ where: { status: "approved", visibility: "public" }, _sum: { viewCount: true } }),
  ]);

  const where: any = {
    status: "approved",
    visibility: "public",
    publishedAt: { not: null },
  };

  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const videos = await prisma.video.findMany({
    where,
    orderBy: filter === "recommended"
      ? [{ qualityScore: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }],
    take: 10,
    include: {
      account: {
        select: {
          id: true,
          nickname: true,
          avatarPath: true,
          avatarMime: true,
          certificationStatus: true,
          certificationScore: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (videos.length > 0) {
    const lastVideo = videos[videos.length - 1];
    nextCursor = lastVideo.createdAt?.toISOString() || null;
  }

  const categories = [
    { id: "all", name: locale === "zh-Hans" ? "全部" : locale === "zh-Hant" ? "全部" : "All", icon: "🌟" },
    { id: "aircraft", name: locale === "zh-Hans" ? "飞机" : locale === "zh-Hant" ? "飛機" : "Aircraft", icon: "✈️" },
    { id: "airport", name: locale === "zh-Hans" ? "机场" : locale === "zh-Hant" ? "機場" : "Airport", icon: "🏢" },
    { id: "airshow", name: locale === "zh-Hans" ? "航展" : locale === "zh-Hant" ? "航展" : "Airshow", icon: "🎬" },
    { id: "training", name: locale === "zh-Hans" ? "训练" : locale === "zh-Hant" ? "訓練" : "Training", icon: "🎓" },
  ];

  return (
    <div className="relative min-h-screen space-y-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-[-12rem] mx-auto h-[28rem] w-[86rem] bg-[radial-gradient(circle_at_16%_24%,rgba(249,115,22,0.16),transparent_38%),radial-gradient(circle_at_80%_18%,rgba(236,72,153,0.16),transparent_34%),radial-gradient(circle_at_56%_80%,rgba(14,165,233,0.14),transparent_38%),radial-gradient(circle_at_36%_56%,rgba(168,85,247,0.12),transparent_32%)]" />
      <section className="ui-panel-strong relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white/95 via-rose-50/70 to-orange-50/70 p-5 shadow-[0_14px_44px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/78 dark:via-rose-950/20 dark:to-violet-950/20 md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-red-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-7rem] left-1/3 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/10 to-pink-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {locale === "en" ? "AviSpotters Video" : locale === "zh-Hans" ? "AviSpotters 视频站" : "AviSpotters 影片站"}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {locale === "en" ? "Aviation Video Hub" : locale === "zh-Hans" ? "航空视频中心" : "航空影片中心"}
            </h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 md:text-base">
              {locale === "en" ? "Browse trending clips, channels, and latest uploads." : locale === "zh-Hans" ? "浏览热门视频、频道和最新上传内容。" : "瀏覽熱門影片、頻道和最新上傳內容。"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <Link
                href={realVideoAccount ? `/video/account/${realVideoAccount.id}` : "/video/account/create"}
                className="ui-btn-muted"
              >
                {realVideoAccount
                  ? locale === "en"
                    ? "My Channel"
                    : locale === "zh-Hans"
                      ? "我的频道"
                      : "我的頻道"
                  : locale === "en"
                    ? "Create Channel"
                    : locale === "zh-Hans"
                      ? "创建频道"
                      : "建立頻道"}
              </Link>
            ) : null}
            <Link href="/video/upload" className="ui-btn-primary">
              {locale === "en" ? "Upload Video" : locale === "zh-Hans" ? "上传视频" : "上傳影片"}
            </Link>
          </div>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          <div className="ui-panel bg-white/70 px-4 py-3 dark:bg-white/5">
            <div className="text-xl font-black text-slate-900 dark:text-white">{totalVideos.toLocaleString()}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">{locale === "en" ? "Published Videos" : locale === "zh-Hans" ? "已发布视频" : "已發佈影片"}</div>
          </div>
          <div className="ui-panel bg-white/70 px-4 py-3 dark:bg-white/5">
            <div className="text-xl font-black text-slate-900 dark:text-white">{totalAccounts.toLocaleString()}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">{locale === "en" ? "Active Creators" : locale === "zh-Hans" ? "活跃创作者" : "活躍創作者"}</div>
          </div>
          <div className="ui-panel bg-white/70 px-4 py-3 dark:bg-white/5">
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {(totalViews._sum.viewCount || 0) >= 10000 ? `${((totalViews._sum.viewCount || 0) / 10000).toFixed(1)}W` : (totalViews._sum.viewCount || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">{locale === "en" ? "Total Plays" : locale === "zh-Hans" ? "总播放量" : "總播放量"}</div>
          </div>
        </div>
      </section>

      <section className="sticky top-[74px] z-30 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/65">
        <div className="flex min-w-max items-center gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/video?filter=${filter}&category=${cat.id}`}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                category === cat.id
                  ? "bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              }`}
            >
              {cat.icon} {cat.name}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-white/15" />
          {[
            { key: "recommended", label: locale === "en" ? "Recommended" : locale === "zh-Hans" ? "推荐" : "推薦" },
            { key: "latest", label: locale === "en" ? "Latest" : locale === "zh-Hans" ? "最新" : "最新" },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={`/video?filter=${tab.key}&category=${category}`}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                filter === tab.key
                  ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white dark:from-cyan-500/80 dark:to-violet-500/80"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white/92 via-pink-50/35 to-cyan-50/50 p-4 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/70 dark:via-fuchsia-950/10 dark:to-cyan-950/15 md:p-5">
          <VideoFeed initialVideos={videos as any} initialCursor={nextCursor || undefined} locale={locale} />
        </div>
        <aside className="space-y-4">
          {hotVideos.length > 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white/92 via-rose-50/45 to-orange-50/55 p-4 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/75 dark:via-rose-950/14 dark:to-orange-950/10">
              <div className="mb-3 text-sm font-bold text-slate-900 dark:text-white">🔥 {locale === "en" ? "Trending Now" : locale === "zh-Hans" ? "热门榜" : "熱門榜"}</div>
              <div className="space-y-2">
                {hotVideos.map((v, idx) => (
                  <Link key={v.id} href={`/video/${v.id}`} className="block rounded-xl border border-slate-200/80 bg-white/80 p-3 text-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <div className="text-xs font-semibold text-rose-600 dark:text-rose-300">#{idx + 1}</div>
                    <div className="mt-1 line-clamp-2 font-semibold text-slate-900 dark:text-white">{v.description || (locale === "en" ? "Untitled video" : locale === "zh-Hans" ? "未命名视频" : "未命名影片")}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{v.account?.nickname || "AviSpotters"} · {(v.viewCount || 0).toLocaleString()}</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {category !== "all" && categoryVideos.length > 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white/92 via-violet-50/40 to-cyan-50/45 p-4 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/75 dark:via-violet-950/12 dark:to-cyan-950/12">
              <div className="mb-3 text-sm font-bold text-slate-900 dark:text-white">{locale === "en" ? "You May Also Like" : locale === "zh-Hans" ? "你可能喜欢" : "你可能喜歡"}</div>
              <div className="space-y-2">
                {categoryVideos.slice(0, 6).map((v) => (
                  <Link key={v.id} href={`/video/${v.id}`} className="block rounded-xl border border-slate-200/80 bg-white/80 p-3 text-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <div className="line-clamp-2 font-semibold text-slate-900 dark:text-white">{v.description || (locale === "en" ? "Untitled video" : locale === "zh-Hans" ? "未命名视频" : "未命名影片")}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{v.account?.nickname || "AviSpotters"}</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
