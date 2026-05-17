import Link from "next/link";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";
import { computeLeaderboard, getLeaderboard, getLocalizedText, resolveRange } from "@/lib/custom-leaderboards";

function fmtRange(locale: "zh-Hant" | "zh-Hans" | "en", def: { rangeKey: string; rangeStart: Date | null; rangeEnd: Date | null }) {
  const { since, start, end } = resolveRange(def);
  if (since) return locale === "en" ? "Rolling window" : locale === "zh-Hans" ? "滚动时间" : "滾動時間";
  if (start || end) {
    const s = start ? start.toISOString().slice(0, 10) : "";
    const e = end ? end.toISOString().slice(0, 10) : "";
    if (s && e) return `${s} ~ ${e}`;
    if (s) return locale === "en" ? `Since ${s}` : locale === "zh-Hans" ? `自 ${s}` : `自 ${s}`;
    if (e) return locale === "en" ? `Until ${e}` : locale === "zh-Hans" ? `截至 ${e}` : `截至 ${e}`;
  }
  return "";
}

export default async function CustomLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getServerLocaleOnly();
  const { id } = await params;
  const def = await getLeaderboard(id);
  if (!def || !def.enabled) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Not found" : locale === "zh-Hans" ? "不存在" : "不存在"}</h1>
        <Link href="/leaderboard" className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
          {locale === "en" ? "Back to leaderboard →" : locale === "zh-Hans" ? "返回排行榜 →" : "返回排行榜 →"}
        </Link>
      </div>
    );
  }

  const title = getLocalizedText(locale, def.titleJson, "Leaderboard");
  const desc = def.descJson ? getLocalizedText(locale, def.descJson, "") : "";
  const rows = await computeLeaderboard(def);
  const rangeHint = fmtRange(locale, def);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          {desc ? <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{desc}</p> : null}
          {rangeHint ? <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">{rangeHint}</div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/leaderboard"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {t(locale, "leaderboard.title")}
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2">{t(locale, "leaderboard.col.rank")}</th>
              <th className="px-3 py-2">{t(locale, "leaderboard.col.user")}</th>
              <th className="px-3 py-2">{t(locale, "leaderboard.col.approved")}</th>
              <th className="px-3 py-2">{t(locale, "leaderboard.col.rejected")}</th>
              <th className="px-3 py-2">{t(locale, "leaderboard.col.passRate")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r, idx) => (
              <tr key={r.userId} className="border-t border-slate-200 dark:border-white/10">
                <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{idx + 1}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
                </td>
                <td className="px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-200">{r.approved.toLocaleString()}</td>
                <td className="px-3 py-2 font-semibold text-red-700 dark:text-red-200">{r.rejected.toLocaleString()}</td>
                <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{r.passRate == null ? "—" : `${r.passRate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <div className="p-6 text-sm text-slate-700 dark:text-slate-200">{t(locale, "leaderboard.empty")}</div> : null}
      </div>
    </div>
  );
}

