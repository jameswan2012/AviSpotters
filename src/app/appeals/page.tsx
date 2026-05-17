import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { AppealDeleteButton } from "@/components/appeals/AppealDeleteButton";

export default async function AppealsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();

  const appeals = await prisma.appeal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      message: true,
      staffReply: true,
      createdAt: true,
      reviewedAt: true,
      photo: { select: { id: true, registration: true, title: true } },
    },
  });

  function statusLabel(s: string) {
    if (s === "accepted") return locale === "en" ? "Accepted (re-review)" : locale === "zh-Hans" ? "已受理（重新审核）" : "已受理（重新審核）";
    if (s === "dismissed") return locale === "en" ? "Dismissed" : locale === "zh-Hans" ? "已驳回" : "已駁回";
    return locale === "en" ? "Pending" : locale === "zh-Hans" ? "待处理" : "待處理";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "My appeals" : locale === "zh-Hans" ? "我的申诉" : "我的申訴"}</h1>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "Appeal results will show here." : locale === "zh-Hans" ? "申诉处理结果会显示在这里。" : "申訴處理結果會顯示在這裡。"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="ui-btn-muted">
            {locale === "en" ? "Dashboard" : locale === "zh-Hans" ? "仪表板" : "儀表板"}
          </Link>
          <Link href="/photos/mine?status=rejected" className="ui-btn-primary">
            {locale === "en" ? "Go rejected photos" : locale === "zh-Hans" ? "前往未通过作品" : "前往未通過作品"}
          </Link>
        </div>
      </div>

      <div className="ui-panel overflow-hidden">
        <div className="grid grid-cols-1 gap-0 divide-y divide-slate-200 dark:divide-white/10">
          {appeals.map((a) => (
            <div key={a.id} className="p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    <Link href={`/photos/${encodeURIComponent(a.photo.id)}`} className="hover:underline">
                      {a.photo.title ?? a.photo.registration}
                    </Link>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{a.createdAt.toISOString().slice(0, 10)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{statusLabel(a.status)}</div>
                  {a.status === "open" ? <AppealDeleteButton appealId={a.id} locale={locale} /> : null}
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{a.message}</div>

              {a.staffReply ? (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-50 whitespace-pre-wrap">
                  {locale === "en" ? "Staff reply" : locale === "zh-Hans" ? "管理员回复" : "管理員回覆"}：{a.staffReply}
                </div>
              ) : null}
            </div>
          ))}

          {!appeals.length ? <div className="p-6 text-sm text-slate-700 dark:text-slate-200">{locale === "en" ? "No appeals yet." : locale === "zh-Hans" ? "暂无申诉。" : "暫無申訴。"}</div> : null}
        </div>
      </div>
    </div>
  );
}

