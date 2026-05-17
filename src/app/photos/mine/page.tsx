import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { PhotoDeleteButton } from "@/components/photos/PhotoDeleteButton";

export default async function MyPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const status =
    sp.status === "pending" || sp.status === "approved" || sp.status === "rejected" ? sp.status : "all";

  function text(zhHant: string, zhHans: string, en: string) {
    return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
  }

  const [counts, photos, openAppeals] = await Promise.all([
    Promise.all([
      prisma.photo.count({ where: { userId: user.id, status: "approved" } }),
      prisma.photo.count({ where: { userId: user.id, status: "pending" } }),
      prisma.photo.count({ where: { userId: user.id, status: "rejected" } }),
    ]),
    prisma.photo.findMany({
      where: {
        userId: user.id,
        ...(status === "all" ? {} : { status }),
      },
      orderBy: [{ createdAt: "desc" }],
      take: 120,
      select: {
        id: true,
        status: true,
        title: true,
        registration: true,
        airline: true,
        aircraftModel: true,
        shotAirport: true,
        shotAt: true,
        createdAt: true,
        reviewedAt: true,
        reviewReason: true,
      },
    }),
    prisma.appeal.findMany({
      where: { userId: user.id, status: "open" },
      select: { photoId: true },
    }),
  ]);

  const [approvedCount, pendingCount, rejectedCount] = counts;
  const openAppealSet = new Set(openAppeals.map((item) => item.photoId));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{text("我的作品", "我的作品", "My photos")}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {text("查看你目前所有投稿的狀態，並在需要時發起申訴或自行刪除。", "查看你目前所有投稿的状态，并在需要时发起申诉或自行删除。", "Review the status of your submissions, start an appeal when needed, or delete them yourself.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/photos/upload" className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
              {text("上傳照片", "上传照片", "Upload photo")}
            </Link>
            <Link href="/dashboard" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
              {text("返回儀表板", "返回仪表板", "Back to dashboard")}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatusCard href="/photos/mine?status=approved" title={text("已通過", "已通过", "Approved")} value={approvedCount} active={status === "approved"} />
        <StatusCard href="/photos/mine?status=pending" title={text("待審", "待审", "Pending")} value={pendingCount} active={status === "pending"} />
        <StatusCard href="/photos/mine?status=rejected" title={text("已拒絕", "已拒绝", "Rejected")} value={rejectedCount} active={status === "rejected"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip href="/photos/mine" active={status === "all"} label={text("全部", "全部", "All")} />
        <FilterChip href="/photos/mine?status=approved" active={status === "approved"} label={text("已通過", "已通过", "Approved")} />
        <FilterChip href="/photos/mine?status=pending" active={status === "pending"} label={text("待審", "待审", "Pending")} />
        <FilterChip href="/photos/mine?status=rejected" active={status === "rejected"} label={text("已拒絕", "已拒绝", "Rejected")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => {
          const hasOpenAppeal = openAppealSet.has(photo.id);
          return (
            <div key={photo.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${encodeURIComponent(photo.id)}/image?variant=thumb`} alt={photo.title ?? photo.registration} className="h-52 w-full object-cover" />
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="line-clamp-1 text-base font-semibold text-slate-900 dark:text-white">
                    {photo.title || photo.registration}
                  </div>
                  <span
                    className={[
                      "rounded-xl border px-2 py-1 text-[11px] font-semibold",
                      photo.status === "approved"
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                        : photo.status === "rejected"
                          ? "border-red-400/20 bg-red-500/10 text-red-700 dark:text-red-200"
                          : "border-amber-400/20 bg-amber-500/10 text-amber-700 dark:text-amber-200",
                    ].join(" ")}
                  >
                    {photo.status === "approved"
                      ? text("已通過", "已通过", "Approved")
                      : photo.status === "rejected"
                        ? text("已拒絕", "已拒绝", "Rejected")
                        : text("待審", "待审", "Pending")}
                  </span>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {photo.registration} · {photo.airline} · {photo.aircraftModel}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {photo.shotAirport} · {photo.shotAt}
                </div>

                {photo.status === "rejected" && photo.reviewReason ? (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-100">
                    {photo.reviewReason}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {photo.status === "approved" ? (
                    <Link href={`/photos/${encodeURIComponent(photo.id)}`} className="rounded-2xl bg-sky-500 px-3 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
                      {text("查看", "查看", "View")}
                    </Link>
                  ) : null}
                  {photo.status === "rejected" ? (
                    hasOpenAppeal ? (
                      <Link href="/appeals" className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-200">
                        {text("已有申訴", "已有申诉", "Appeal opened")}
                      </Link>
                    ) : (
                      <Link href={`/appeals/new?photoId=${encodeURIComponent(photo.id)}`} className="rounded-2xl bg-fuchsia-500 px-3 py-2 text-sm font-semibold text-fuchsia-950 hover:bg-fuchsia-400">
                        {text("發起申訴", "发起申诉", "Appeal")}
                      </Link>
                    )
                  ) : null}
                  <PhotoDeleteButton photoId={photo.id} locale={locale} disabled={photo.status === "rejected"} />
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {text("提交時間", "提交时间", "Submitted")}: {photo.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  {photo.reviewedAt ? ` · ${text("審核時間", "审核时间", "Reviewed")}: ${photo.reviewedAt.toISOString().slice(0, 19).replace("T", " ")}` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!photos.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {text("目前沒有符合條件的作品。", "目前没有符合条件的作品。", "No photos matched the current filter.")}
        </div>
      ) : null}
    </div>
  );
}

function StatusCard({
  href,
  title,
  value,
  active,
}: {
  href: string;
  title: string;
  value: number;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-3xl border bg-white p-5 dark:border-white/10 dark:bg-white/5",
        active ? "border-sky-400/40 ring-2 ring-sky-400/20" : "border-slate-200",
      ].join(" ")}
    >
      <div className="text-sm text-slate-600 dark:text-slate-300">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value.toLocaleString()}</div>
    </Link>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-xl border px-3 py-1.5 text-sm font-semibold",
        active
          ? "border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-200"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
