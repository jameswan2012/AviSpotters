import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { ReReviewAction } from "@/components/admin/ReReviewAction";

function normalizeQ(q: string | null) {
  return (q ?? "").trim();
}

export default async function AdminPhotoHistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; decision?: string }> }) {
  const { roleId } = await requireStaff();
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const q = normalizeQ(sp.q ?? null);
  const decision = (sp.decision ?? "").toLowerCase();
  const decisionFilter = decision === "approved" || decision === "rejected" ? decision : null;

  const where: any = {
    status: { in: ["approved", "rejected"] },
    ...(decisionFilter ? { status: decisionFilter } : {}),
    ...(q
      ? {
          OR: [
            { registration: { contains: q.toUpperCase() } },
            { aircraftModel: { contains: q } },
            { airline: { contains: q } },
            { shotAirport: { contains: q } },
            { title: { contains: q } },
            { user: { is: { email: { contains: q.toLowerCase() } } } },
            { user: { is: { name: { contains: q } } } },
          ],
        }
      : {}),
  };

  const rows = await prisma.photo.findMany({
    where,
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      status: true,
      reviewedAt: true,
      title: true,
      registration: true,
      airline: true,
      aircraftModel: true,
      shotAirport: true,
      shotAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const canReReview = roleId >= 4;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Review history" : locale === "zh-Hans" ? "历史审图" : "歷史審圖"}
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Latest approved/rejected photos (up to 200). Super Admin can initiate a re-review."
              : locale === "zh-Hans"
                ? "显示最近已通过/已拒绝的作品（最多 200）。仅高级管理员可发起回溯二审。"
                : "顯示最近已通過/已拒絕的作品（最多 200）。僅高級管理員可發起回溯二審。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/photos" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
            {locale === "en" ? "Back to pending" : locale === "zh-Hans" ? "返回待审" : "返回待審"}
          </Link>
        </div>
      </div>

      <form className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 md:flex-row md:items-center" action="/admin/photos/history" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder={locale === "en" ? "Search registration/model/airline/uploader…" : locale === "zh-Hans" ? "搜索注册号/机型/航司/上传者…" : "搜尋註冊號/機型/航司/上傳者…"}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
        />
        <select
          name="decision"
          defaultValue={decisionFilter ?? ""}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
        >
          <option value="">{locale === "en" ? "All" : locale === "zh-Hans" ? "全部" : "全部"}</option>
          <option value="approved">{locale === "en" ? "Approved" : locale === "zh-Hans" ? "已通过" : "已通過"}</option>
          <option value="rejected">{locale === "en" ? "Rejected" : locale === "zh-Hans" ? "已拒绝" : "已拒絕"}</option>
        </select>
        <button type="submit" className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-sky-950 hover:bg-sky-400">
          {locale === "en" ? "Search" : locale === "zh-Hans" ? "搜索" : "搜尋"}
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => {
          const author = p.user.name ?? p.user.email;
          const reviewed = p.reviewedAt ? p.reviewedAt.toISOString().slice(0, 19).replace("T", " ") : "—";
          return (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <Link href={`/admin/photos/${encodeURIComponent(p.id)}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=thumb`} alt={p.title ?? p.registration} className="h-44 w-full object-cover" />
              </Link>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/admin/photos/${encodeURIComponent(p.id)}`} className="truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white">
                    {p.title ?? p.registration}
                  </Link>
                  <span
                    className={[
                      "rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                      p.status === "approved"
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                        : "border-red-400/20 bg-red-500/10 text-red-700 dark:text-red-200",
                    ].join(" ")}
                  >
                    {p.status === "approved"
                      ? locale === "en"
                        ? "Approved"
                        : locale === "zh-Hans"
                          ? "已通过"
                          : "已通過"
                      : locale === "en"
                        ? "Rejected"
                        : locale === "zh-Hans"
                          ? "已拒绝"
                          : "已拒絕"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  {p.airline} · {p.aircraftModel} · {p.shotAirport}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {p.shotAt} · {author}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {locale === "en" ? `Reviewed: ${reviewed}` : locale === "zh-Hans" ? `审图时间：${reviewed}` : `審圖時間：${reviewed}`}
                </div>
                {canReReview ? (
                  <div className="mt-3">
                    <ReReviewAction photoId={p.id} variant="link" />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {!rows.length ? (
        <div className="text-sm text-slate-700 dark:text-slate-200">
          {locale === "en" ? "No results." : locale === "zh-Hans" ? "没有结果。" : "沒有結果。"}
        </div>
      ) : null}
    </div>
  );
}

