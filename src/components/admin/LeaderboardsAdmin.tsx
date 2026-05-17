"use client";

type Row = {
  id: string;
  enabled: boolean;
  titleJson: string;
  descJson: string | null;
  metric: string;
  rangeKey: string;
  updatedAt: string | Date;
};

export function LeaderboardsAdmin({
  locale,
  canEdit,
  initialRows,
}: {
  locale: "zh-Hant" | "zh-Hans" | "en";
  canEdit: boolean;
  initialRows: Row[];
}) {
  const title = locale === "en" ? "Custom leaderboards" : locale === "zh-Hans" ? "自定义排行榜" : "自訂排行榜";
  const hint =
    locale === "en"
      ? "The original editor source is being restored. Existing entries are listed below."
      : locale === "zh-Hans"
        ? "原编辑器源码正在恢复，现先列出已有项目。"
        : "原編輯器原始碼正在恢復，現先列出既有項目。";

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
      <div className="text-xl font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm text-slate-300">{hint}</div>
      <div className="mt-5 grid gap-3">
        {initialRows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-white">{row.metric}</div>
              <div className="text-xs text-slate-400">{row.enabled ? "enabled" : "disabled"}</div>
            </div>
            <div className="mt-1 text-xs text-slate-400">{row.rangeKey}</div>
          </div>
        ))}
      </div>
      {!canEdit ? <div className="mt-4 text-xs text-amber-300">Read only</div> : null}
    </div>
  );
}
