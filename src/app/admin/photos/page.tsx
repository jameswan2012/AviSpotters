import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";

function text(locale: string, zhHant: string, zhHans: string, en: string) {
  return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
}

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user, roleId } = await requireStaff();
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const q = String(sp.q || "").trim();

  const where: any = {
    status: "pending",
    ...(q
      ? {
          OR: [
            { registration: { contains: q.toUpperCase() } },
            { aircraftModel: { contains: q } },
            { airline: { contains: q } },
            { shotAirport: { contains: q } },
            { title: { contains: q } },
            { user: { is: { name: { contains: q } } } },
            { user: { is: { email: { contains: q.toLowerCase() } } } },
          ],
        }
      : {}),
  };

  const pending = await prisma.photo.findMany({
    where,
    orderBy: [{ priority: "desc" }, { reReviewRequestedAt: "desc" }, { createdAt: "asc" }],
    take: 80,
    select: {
      id: true,
      title: true,
      registration: true,
      airline: true,
      aircraftModel: true,
      shotAirport: true,
      shotAt: true,
      createdAt: true,
      priority: true,
      reReviewRequestedAt: true,
      firstReviewDecision: true,
      assignedReviewerId: true,
      assignedReviewer: { select: { name: true, email: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            {text(locale, "照片審核", "照片审核", "Photo review")}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {text(locale, "待審作品會集中在這裡，點進單圖頁後可直接查看原圖、查重與提交審核結果。", "待审作品会集中在这里，点进单图页后可直接查看原图、查重与提交审核结果。", "All pending photos appear here. Open a photo to inspect the original, compare against approved works, and submit a decision.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/photos/history"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {text(locale, "歷史審圖", "历史审图", "History")}
          </Link>
          {roleId >= 4 ? (
            <Link
              href="/admin/photos/pdf-import"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              PDF Import
            </Link>
          ) : null}
        </div>
      </div>

      <form action="/admin/photos" method="get" className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 md:flex-row">
        <input
          name="q"
          defaultValue={q}
          placeholder={text(locale, "搜尋註冊號 / 機型 / 航司 / 上傳者", "搜索注册号 / 机型 / 航司 / 上传者", "Search registration / model / airline / uploader")}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
        />
        <button type="submit" className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-sky-950 hover:bg-sky-400">
          {text(locale, "搜尋", "搜索", "Search")}
        </button>
      </form>

      <div className="text-sm text-slate-600 dark:text-slate-300">
        {text(locale, "目前待審", "目前待审", "Pending now")} <span className="font-bold text-slate-900 dark:text-white">{pending.length}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pending.map((photo) => {
          const author = photo.user.name ?? photo.user.email;
          const assigned = photo.assignedReviewer?.name ?? photo.assignedReviewer?.email ?? null;
          const assignedToMe = photo.assignedReviewerId === user.id;
          return (
            <div key={photo.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <Link href={`/admin/photos/${encodeURIComponent(photo.id)}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${encodeURIComponent(photo.id)}/image?variant=thumb`} alt={photo.title ?? photo.registration} className="h-52 w-full object-cover" />
              </Link>
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  {photo.priority > 0 ? <Badge tone="amber">{text(locale, "優先", "优先", "Priority")}</Badge> : null}
                  {photo.reReviewRequestedAt ? <Badge tone="fuchsia">{text(locale, "回溯二審", "回溯二审", "Re-review")}</Badge> : null}
                  {photo.firstReviewDecision ? <Badge tone="sky">{text(locale, "已有初審", "已有初审", "Has first review")}</Badge> : null}
                  <Badge tone={assignedToMe ? "emerald" : assigned ? "amber" : "slate"}>
                    {assignedToMe
                      ? text(locale, "已指派給我", "已指派给我", "Assigned to me")
                      : assigned
                        ? `${text(locale, "已指派", "已指派", "Assigned")}: ${assigned}`
                        : text(locale, "未指派", "未指派", "Unassigned")}
                  </Badge>
                </div>

                <div>
                  <Link href={`/admin/photos/${encodeURIComponent(photo.id)}`} className="line-clamp-1 text-base font-semibold text-slate-900 hover:underline dark:text-white">
                    {photo.title || photo.registration}
                  </Link>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {photo.registration} · {photo.airline} · {photo.aircraftModel}
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {photo.shotAirport} · {photo.shotAt} · {author}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{photo.createdAt.toISOString().slice(0, 19).replace("T", " ")}</div>
                  <Link
                    href={`/admin/photos/${encodeURIComponent(photo.id)}`}
                    className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400"
                  >
                    {text(locale, "審核此圖", "审核此图", "Review")}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!pending.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {text(locale, "目前沒有符合條件的待審作品。", "目前没有符合条件的待审作品。", "No pending photos matched the current filter.")}
        </div>
      ) : null}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "slate" | "sky" | "amber" | "emerald" | "fuchsia";
}) {
  const className =
    tone === "sky"
      ? "border-sky-400/20 bg-sky-500/10 text-sky-700 dark:text-sky-200"
      : tone === "amber"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-700 dark:text-amber-200"
        : tone === "emerald"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          : tone === "fuchsia"
            ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200"
            : "border-slate-300/30 bg-slate-500/10 text-slate-700 dark:text-slate-200";

  return <span className={`rounded-xl border px-2 py-1 text-[11px] font-semibold ${className}`}>{children}</span>;
}
