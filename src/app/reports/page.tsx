import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();

  const reports = await prisma.correctionReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: { id: true, targetType: true, targetId: true, status: true, message: true, createdAt: true, reviewedAt: true },
  });

  const photoIds = reports.filter((r) => r.targetType === "photo").map((r) => r.targetId);
  const airportIds = reports.filter((r) => r.targetType === "airport").map((r) => r.targetId);

  const [photos, airports] = await Promise.all([
    photoIds.length
      ? prisma.photo.findMany({ where: { id: { in: photoIds } }, select: { id: true, title: true, registration: true } })
      : Promise.resolve([]),
    airportIds.length
      ? prisma.airport.findMany({ where: { id: { in: airportIds } }, select: { id: true, iata: true, icao: true, nameZh: true, nameEn: true } })
      : Promise.resolve([]),
  ]);

  const photoMap = new Map(photos.map((p) => [p.id, p] as const));
  const airportMap = new Map(airports.map((a) => [a.id, a] as const));

  function statusLabel(s: string) {
    if (s === "kept") return locale === "en" ? "Kept (no action)" : locale === "zh-Hans" ? "已保留（无事发生）" : "已保留（無事發生）";
    if (s === "deleted") return locale === "en" ? "Deleted" : locale === "zh-Hans" ? "已删除" : "已刪除";
    return locale === "en" ? "Pending" : locale === "zh-Hans" ? "待处理" : "待處理";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "My reports" : locale === "zh-Hans" ? "我的举报" : "我的舉報"}</h1>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Your reports will be reviewed by staff. The target remains visible until a decision is made."
              : locale === "zh-Hans"
                ? "你的举报会由审核员审查。在作出决定前，被举报对象会正常显示。"
                : "你的舉報會由審核員審查。在作出決定前，被舉報對象會正常顯示。"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="ui-btn-muted">
            {locale === "en" ? "Dashboard" : locale === "zh-Hans" ? "仪表板" : "儀表板"}
          </Link>
        </div>
      </div>

      <div className="ui-panel overflow-hidden">
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {reports.map((r) => (
            <div key={r.id} className="p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {locale === "en" ? "Target" : locale === "zh-Hans" ? "对象" : "對象"}：
                  {r.targetType === "photo" ? (
                    <>
                      {" "}
                      {(() => {
                        const p = photoMap.get(r.targetId);
                        const label = p ? p.title ?? p.registration : r.targetId;
                        return (
                          <Link href={`/photos/${encodeURIComponent(r.targetId)}`} className="text-sky-700 hover:underline dark:text-sky-300">
                            {label}
                          </Link>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      {" "}
                      {(() => {
                        const a = airportMap.get(r.targetId);
                        const code = a ? a.iata ?? a.icao ?? a.id : r.targetId;
                        const name = a ? (locale === "en" ? a.nameEn : a.nameZh) : null;
                        return (
                          <span className="text-slate-700 dark:text-slate-200">
                            {code}
                            {name ? ` · ${name}` : ""}
                          </span>
                        );
                      })()}
                    </>
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{statusLabel(r.status)}</div>
              </div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">{r.createdAt.toISOString().slice(0, 10)}</div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{r.message}</div>
            </div>
          ))}
          {!reports.length ? <div className="p-6 text-sm text-slate-700 dark:text-slate-200">{locale === "en" ? "No reports yet." : locale === "zh-Hans" ? "暂无举报。" : "暫無舉報。"}</div> : null}
        </div>
      </div>
    </div>
  );
}

