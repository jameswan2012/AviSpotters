import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";
import { prisma } from "@/lib/db";
import { FeaturedPhotoCarousel } from "@/components/home/FeaturedPhotoCarousel";
import { HomeUnifiedSearch } from "@/components/home/HomeUnifiedSearch";
import { getRegistrationSetting } from "@/lib/site-settings";

export default async function HomePage() {
  const user = await getCurrentUser();
  const locale = await getServerLocaleOnly();
  const homeWrap = "mx-auto w-full max-w-[114rem] px-4 md:px-6";

  const topicLabels: Record<string, { name: string; emoji: string; bg: string }> = {
    "special_livery": { name: locale === "zh-Hans" ? "特殊涂装" : locale === "zh-Hant" ? "特殊塗裝" : "Special Livery", emoji: "🎨", bg: "from-purple-500/20 to-pink-500/20" },
    "airport": { name: locale === "zh-Hans" ? "机场" : locale === "zh-Hant" ? "機場" : "Airport", emoji: "🏢", bg: "from-blue-500/20 to-cyan-500/20" },
    "cabin": { name: locale === "zh-Hans" ? "客舱" : locale === "zh-Hant" ? "客艙" : "Cabin", emoji: "💺", bg: "from-emerald-500/20 to-teal-500/20" },
    "cockpit": { name: locale === "zh-Hans" ? "驾驶舱" : locale === "zh-Hant" ? "駕駛艙" : "Cockpit", emoji: "🛫", bg: "from-sky-500/20 to-blue-500/20" },
    "night_shot": { name: locale === "zh-Hans" ? "夜拍" : locale === "zh-Hant" ? "夜拍" : "Night Shot", emoji: "🌙", bg: "from-indigo-500/20 to-purple-500/20" },
    "airshow": { name: locale === "zh-Hans" ? "航展" : locale === "zh-Hant" ? "航展" : "Airshow", emoji: "✈️", bg: "from-orange-500/20 to-red-500/20" },
    "special_plane": { name: locale === "zh-Hans" ? "专机" : locale === "zh-Hant" ? "專機" : "Special Plane", emoji: "⭐", bg: "from-amber-500/20 to-yellow-500/20" },
  };

  const topicIds = Object.keys(topicLabels);

  const [featuredRoll, latestPhotos, stats, registration, hotToday, topicPhotos, topVideos] = await Promise.all([
    prisma.photo.findMany({
      where: { status: "approved", featured: true },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: { id: true, title: true, registration: true, airline: true, aircraftModel: true, shotAirport: true, shotAt: true },
    }),
    prisma.photo.findMany({
      where: { status: "approved" },
      orderBy: [{ createdAt: "desc" }],
      take: 6,
      select: { id: true, title: true, registration: true },
    }),
    (async () => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const reviewerPlusRoleId = 2;
      const onlineCutoff = new Date(now.getTime() - 10 * 60 * 1000);
      const [users, approved, pending, reviewerTotal, activeReviewers, activeReviewerList, reviewedTodayApproved, reviewedTodayRejected] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.photo.count({ where: { status: "approved" } }),
        prisma.photo.count({ where: { status: "pending" } }),
        prisma.user.count({ where: { deletedAt: null, roleId: { gte: reviewerPlusRoleId } } }),
        prisma.user.count({ where: { deletedAt: null, roleId: { gte: reviewerPlusRoleId }, lastSeenAt: { gte: onlineCutoff } } }),
        prisma.user.findMany({
          where: { deletedAt: null, roleId: { gte: reviewerPlusRoleId }, lastSeenAt: { gte: onlineCutoff } },
          orderBy: [{ lastSeenAt: "desc" }, { roleId: "desc" }],
          take: 6,
          select: { id: true, name: true, email: true, roleId: true },
        }),
        prisma.photo.count({ where: { status: "approved", reviewedAt: { gte: start, lte: end } } }),
        prisma.photo.count({ where: { status: "rejected", reviewedAt: { gte: start, lte: end } } }),
      ]);
      const reviewedToday = reviewedTodayApproved + reviewedTodayRejected;
      const passRateToday = reviewedToday ? Math.round((reviewedTodayApproved / reviewedToday) * 100) : null;
      return { users, approved, pending, reviewerTotal, activeReviewers, activeReviewerList: activeReviewerList.map((u) => ({ id: u.id, name: (u.name ?? u.email) || u.email, roleId: u.roleId })), passRateToday };
    })(),
    getRegistrationSetting(),
    (async () => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return prisma.photo.findMany({
        where: { status: "approved", createdAt: { gte: start, lte: end } },
        orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
        take: 5,
        select: { id: true, title: true, registration: true, _count: { select: { likes: true } } },
      });
    })(),
    Promise.all(topicIds.map(async (topicId) => {
      const photos = await prisma.photo.findMany({
        where: { status: "approved", categoriesJson: { contains: `"${topicId}"` } },
        orderBy: [{ createdAt: "desc" }],
        take: 4,
        select: { id: true, title: true, registration: true },
      });
      return { topicId, photos };
    })),
    prisma.video.findMany({
      where: { status: "approved", visibility: "public", publishedAt: { not: null } },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        description: true,
        viewCount: true,
        account: { select: { nickname: true } },
      },
    }),
  ]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="ios26-aurora pointer-events-none absolute inset-x-0 top-[-12rem] mx-auto h-[32rem] w-[104rem] bg-[radial-gradient(circle_at_20%_30%,rgba(14,165,233,0.14),transparent_40%),radial-gradient(circle_at_78%_20%,rgba(59,130,246,0.1),transparent_36%),radial-gradient(circle_at_50%_75%,rgba(34,211,238,0.1),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.42)_0%,rgba(186,230,253,0.16)_34%,rgba(186,230,253,0.1)_66%,rgba(125,211,252,0.1)_100%)] dark:bg-[linear-gradient(160deg,rgba(2,6,23,0.52)_0%,rgba(14,116,144,0.14)_40%,rgba(12,74,110,0.16)_100%)]" />

      <section className={`${homeWrap} relative mt-4 space-y-4 md:hidden`}>
        <div className="ios26-surface overflow-hidden rounded-3xl p-5">
          <h1 className="text-2xl font-black leading-tight text-slate-900 dark:text-white">
            {locale === "en" ? "AviSpotters" : locale === "zh-Hans" ? "AviSpotters 首页" : "AviSpotters 首頁"}
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            {locale === "en"
              ? "Fast access to upload, gallery, videos and search."
              : locale === "zh-Hans"
                ? "快速进入上传、图库、视频和搜索。"
                : "快速進入上傳、圖庫、影片與搜尋。"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/photos" className="rounded-2xl bg-sky-500 px-3 py-2 text-center text-sm font-semibold text-sky-950 hover:bg-sky-400">
              {locale === "en" ? "Gallery" : locale === "zh-Hans" ? "图库" : "圖庫"}
            </Link>
            <Link href="/video" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
              {locale === "en" ? "Videos" : locale === "zh-Hans" ? "视频" : "影片"}
            </Link>
            <Link href="/photos/upload" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
              {locale === "en" ? "Upload" : locale === "zh-Hans" ? "上传" : "上傳"}
            </Link>
            <Link href="/leaderboard" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
              {locale === "en" ? "Rank" : locale === "zh-Hans" ? "排行" : "排行"}
            </Link>
          </div>
        </div>

        <HomeUnifiedSearch locale={locale} />

        <div className="grid grid-cols-2 gap-2">
          <div className="ios26-tile rounded-2xl p-3">
            <div className="text-xl font-black text-slate-900 dark:text-white">{stats.approved.toLocaleString()}</div>
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              {locale === "en" ? "Approved" : locale === "zh-Hans" ? "已通过" : "已通過"}
            </div>
          </div>
          <div className="ios26-tile rounded-2xl p-3">
            <div className="text-xl font-black text-slate-900 dark:text-white">{stats.pending.toLocaleString()}</div>
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              {locale === "en" ? "Pending" : locale === "zh-Hans" ? "待审核" : "待審核"}
            </div>
          </div>
        </div>

        {latestPhotos.length > 0 ? (
          <div className="ios26-surface rounded-3xl p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              {locale === "en" ? "Latest Photos" : locale === "zh-Hans" ? "最新照片" : "最新照片"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {latestPhotos.slice(0, 4).map((p) => (
                <Link key={p.id} href={`/photos/${encodeURIComponent(p.id)}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=thumb`} alt={p.title ?? p.registration} className="h-20 w-full object-cover" />
                  <div className="truncate px-2 py-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100">{p.registration}</div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className={`relative mt-6 hidden md:block ${homeWrap}`}>
        <section className="liquid-glass relative overflow-hidden rounded-[2.25rem] border border-white/70 px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-16 dark:border-white/10">
          <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/15" />
          <div className="pointer-events-none absolute -bottom-28 right-[-6rem] h-72 w-72 rounded-full bg-blue-300/18 blur-3xl dark:bg-blue-500/12" />
          <div className="pointer-events-none absolute bottom-[-7rem] left-1/3 h-72 w-72 rounded-full bg-cyan-300/14 blur-3xl dark:bg-cyan-500/10" />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-300/50 bg-sky-100/70 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200">
              {locale === "en" ? "AviSpotters Community" : locale === "zh-Hans" ? "AviSpotters 社区" : "AviSpotters 社群"}
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
              {locale === "en" ? "Beautiful Aviation Photography, All in One Place" : locale === "zh-Hans" ? "把航空摄影，做得更好看" : "把航空攝影，做得更好看"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-300 md:text-lg">
              {locale === "en"
                ? "Discover featured aircraft photos, share your own work, and connect with aviation enthusiasts worldwide."
                : locale === "zh-Hans"
                  ? "发现精选航空作品，上传你的摄影内容，并与全球飞友交流。"
                  : "發現精選航空作品，上傳你的攝影內容，並與全球飛友交流。"}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link href="/photos/upload" className="ui-btn-primary">
                    {locale === "en" ? "Upload Photo" : locale === "zh-Hans" ? "上传照片" : "上傳照片"}
                  </Link>
                  <Link href="/dashboard" className="ui-btn-muted">
                    {t(locale, "home.cta.dashboard")}
                  </Link>
                  <Link href="/video" className="ui-btn-muted">
                    {locale === "en" ? "Watch Videos" : locale === "zh-Hans" ? "看视频" : "看影片"}
                  </Link>
                </>
              ) : (
                <>
                  {registration.enabled ? (
                    <Link href="/register" className="ui-btn-primary">
                      {t(locale, "home.cta.register")}
                    </Link>
                  ) : null}
                  <Link href="/login" className="ui-btn-muted">
                    {t(locale, "home.cta.login")}
                  </Link>
                  <Link href="/video" className="ui-btn-muted">
                    {locale === "en" ? "Open Videos" : locale === "zh-Hans" ? "进入视频站" : "進入影片站"}
                  </Link>
                </>
              )}
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.users.toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{locale === "en" ? "Users" : locale === "zh-Hans" ? "用户" : "用戶"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.approved.toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{locale === "en" ? "Approved Photos" : locale === "zh-Hans" ? "已通过照片" : "已通過照片"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.pending.toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{locale === "en" ? "Pending Review" : locale === "zh-Hans" ? "待审核" : "待審核"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-2xl font-black text-sky-600 dark:text-sky-300">{stats.passRateToday == null ? "--" : `${stats.passRateToday}%`}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{locale === "en" ? "Today Pass Rate" : locale === "zh-Hans" ? "今日通过率" : "今日通過率"}</div>
              </div>
            </div>
          </div>
          <div>
            <FeaturedPhotoCarousel
              title={locale === "en" ? "Featured Collection" : locale === "zh-Hans" ? "精选作品" : "精選作品"}
              subtitle={locale === "en" ? "Curated by reviewers and editors" : locale === "zh-Hans" ? "由审核员与编辑共同挑选" : "由審核員與編輯共同挑選"}
              photos={featuredRoll}
              viewMoreLabel={locale === "en" ? "View more" : locale === "zh-Hans" ? "查看更多" : "查看更多"}
              prevLabel={locale === "en" ? "Prev" : locale === "zh-Hans" ? "上一张" : "上一張"}
              nextLabel={locale === "en" ? "Next" : locale === "zh-Hans" ? "下一张" : "下一張"}
            />
          </div>
        </div>
        </section>
      </div>

      <section className={`hidden md:block ${homeWrap}`}>
        <HomeUnifiedSearch locale={locale} />
      </section>

      {stats.activeReviewerList.length > 0 ? (
        <section className={`hidden md:block ${homeWrap} liquid-glass mt-6 rounded-2xl border border-white/70 px-4 py-3 dark:border-white/10`}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {locale === "en" ? "Online reviewers" : locale === "zh-Hans" ? "在线审核员" : "在線審核員"}
            </span>
            {stats.activeReviewerList.map((u) => (
              <span key={u.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                {u.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`hidden md:block ${homeWrap} mt-16 space-y-12`}>
        <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {locale === "en" ? "Browse by Topic" : locale === "zh-Hans" ? "按题材浏览" : "按題材瀏覽"}
            </h2>
            <Link href="/topics" className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
              {locale === "en" ? "View all" : locale === "zh-Hans" ? "查看全部" : "查看全部"} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {topicIds.map((topicId) => {
              const topic = topicLabels[topicId];
              const topicData = topicPhotos.find((t) => t.topicId === topicId);
              const coverPhoto = topicData?.photos?.[0];
              return (
                <Link key={topicId} href={`/topics?topic=${topicId}`} className="group relative aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5">
                  {coverPhoto ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/photos/${encodeURIComponent(coverPhoto.id)}/image?variant=thumb`}
                        alt={topic.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${topic.bg}`}>
                      <span className="text-3xl">{topic.emoji}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <div className="truncate text-xs font-semibold text-white">{topic.name}</div>
                    <div className="text-[11px] text-white/80">{topicData?.photos.length ?? 0}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {hotToday.length > 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
            <h2 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">
              {locale === "en" ? "Trending Today" : locale === "zh-Hans" ? "今日热门" : "今日熱門"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {hotToday.map((p, idx) => (
                <Link key={p.id} href={`/photos/${encodeURIComponent(p.id)}`} className="group relative overflow-hidden rounded-2xl">
                  <span className="absolute left-2 top-2 z-10 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">#{idx + 1}</span>
                  <div className="aspect-[4/5] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=thumb`}
                      alt={p.title ?? p.registration}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="truncate text-sm font-bold text-white">{p.registration}</div>
                    <div className="mt-0.5 text-xs text-white/80">❤ {p._count.likes}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {locale === "en" ? "Latest Photos" : locale === "zh-Hans" ? "最新照片" : "最新照片"}
            </h2>
            <div className="flex items-center gap-2">
              <Link href="/photos" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                {locale === "en" ? "View all" : locale === "zh-Hans" ? "查看全部" : "查看全部"}
              </Link>
              {user ? (
                <Link href="/photos/upload" className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-sky-950 hover:bg-sky-400">
                  {locale === "en" ? "Upload" : locale === "zh-Hans" ? "上传" : "上傳"}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latestPhotos.map((p) => (
              <Link key={p.id} href={`/photos/${encodeURIComponent(p.id)}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                <div className="aspect-[16/10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=thumb`}
                    alt={p.title ?? p.registration}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.title ?? p.registration}</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{p.registration}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {topVideos.length > 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {locale === "en" ? "Video Spotlight" : locale === "zh-Hans" ? "精选视频" : "精選影片"}
              </h2>
              <Link href="/video" className="ui-btn-muted">
                {locale === "en" ? "Go to Video" : locale === "zh-Hans" ? "前往视频站" : "前往影片站"}
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {topVideos.map((v, idx) => (
                <Link key={v.id} href={`/video/${v.id}`} className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="inline-flex rounded-full bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">#{idx + 1}</div>
                  <div className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-rose-700 dark:text-white dark:group-hover:text-rose-300">
                    {v.description || (locale === "en" ? "Untitled video" : locale === "zh-Hans" ? "未命名视频" : "未命名影片")}
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {(v.account?.nickname ?? "AviSpotters")} · {(v.viewCount || 0).toLocaleString()} {locale === "en" ? "views" : locale === "zh-Hans" ? "播放" : "播放"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 pb-2 sm:grid-cols-3">
          <Link href="/leaderboard" className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 hover:bg-white dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/70">
            <div className="text-base font-bold text-slate-900 dark:text-white">{locale === "en" ? "Leaderboard" : locale === "zh-Hans" ? "排行榜" : "排行榜"}</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{locale === "en" ? "Top photographers and points" : locale === "zh-Hans" ? "查看摄影师积分排名" : "查看攝影師積分排名"}</div>
          </Link>
          <Link href="/video" className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 hover:bg-white dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/70">
            <div className="text-base font-bold text-slate-900 dark:text-white">{locale === "en" ? "Video Zone" : locale === "zh-Hans" ? "视频专区" : "影片專區"}</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{locale === "en" ? "Aviation short videos and creators" : locale === "zh-Hans" ? "航空短视频与创作者" : "航空短影片與創作者"}</div>
          </Link>
          <Link href="/chat" className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 hover:bg-white dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/70">
            <div className="text-base font-bold text-slate-900 dark:text-white">{locale === "en" ? "Community Chat" : locale === "zh-Hans" ? "社区聊天" : "社群聊天"}</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{locale === "en" ? "Discuss aviation with spotters" : locale === "zh-Hans" ? "和飞友交流拍机与航空" : "和飛友交流拍機與航空"}</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
