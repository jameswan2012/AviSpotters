import Link from "next/link";
import { getServerLocaleOnly } from "@/i18n/server";
import { listEnabledLeaderboards, getLocalizedText, normalizeMetric, resolveRange } from "@/lib/custom-leaderboards";

function rangeLabel(locale: "zh-Hant" | "zh-Hans" | "en", def: { rangeKey: string; rangeStart: Date | null; rangeEnd: Date | null }) {
  const { since, start, end } = resolveRange(def);
  if (since) return locale === "en" ? "Rolling window" : locale === "zh-Hans" ? "滚动时间" : "滾動時間";
  if (start || end) {
    const s = start ? start.toISOString().slice(0, 10) : "";
    const e = end ? end.toISOString().slice(0, 10) : "";
    return [s, e].filter(Boolean).join(" ~ ");
  }
  return locale === "en" ? "All time" : locale === "zh-Hans" ? "全部时间" : "全部時間";
}

export default async function LeaderboardIndexPage() {
  const locale = await getServerLocaleOnly();
  const boards = await listEnabledLeaderboards();

  return (
    <div className="space-y-6">
      <div className="ui-panel-strong p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {locale === "en" ? "Leaderboards" : locale === "zh-Hans" ? "排行榜" : "排行榜"}
        </h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en"
            ? "Browse all enabled custom leaderboards."
            : locale === "zh-Hans"
              ? "查看当前启用的自定义排行榜。"
              : "查看目前啟用中的自訂排行榜。"}
        </p>
      </div>

      {boards.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {boards.map((board) => {
            const title = getLocalizedText(locale, board.titleJson, "Leaderboard");
            const desc = board.descJson ? getLocalizedText(locale, board.descJson, "") : "";
            const metric = normalizeMetric(board.metric);
            return (
              <Link
                key={board.id}
                href={`/leaderboard/custom/${encodeURIComponent(board.id)}`}
                className="ui-panel block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{title}</div>
                    {desc ? <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">{desc}</div> : null}
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {metric === "pass_rate"
                      ? locale === "en"
                        ? "Pass rate"
                        : locale === "zh-Hans"
                          ? "过图率"
                          : "過圖率"
                      : locale === "en"
                        ? "Approved count"
                        : locale === "zh-Hans"
                          ? "通过数量"
                          : "通過數量"}
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-300">{rangeLabel(locale, board)}</div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="ui-panel p-6 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en" ? "No leaderboards available yet." : locale === "zh-Hans" ? "当前还没有可用排行榜。" : "目前還沒有可用排行榜。"}
        </div>
      )}
    </div>
  );
}
