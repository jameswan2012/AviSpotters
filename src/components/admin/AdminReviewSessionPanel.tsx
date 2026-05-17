"use client";

import { useEffect, useMemo, useState } from "react";

type SessionAction = {
  kind: "approve" | "reject";
  at: string;
  photoId: string;
  label: string;
  reason?: string;
};

const SESSION_KEY = "avispotters.reviewSession.v1";

function readActions(): SessionAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { actions?: SessionAction[] } | null;
    const rows = Array.isArray(parsed?.actions) ? parsed!.actions : [];
    return rows.filter((x) => x && (x.kind === "approve" || x.kind === "reject") && typeof x.at === "string");
  } catch {
    return [];
  }
}

function writeActions(actions: SessionAction[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ actions: actions.slice(0, 300) }));
  } catch {
    // ignore
  }
}

export function AdminReviewSessionPanel({ locale }: { locale: "zh-Hant" | "zh-Hans" | "en" }) {
  const [actions, setActions] = useState<SessionAction[]>([]);

  function tr(zhHant: string, zhHans: string, en: string) {
    return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
  }

  useEffect(() => {
    setActions(readActions());
    const onStorage = () => setActions(readActions());
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, []);

  const approved = useMemo(() => actions.filter((x) => x.kind === "approve").length, [actions]);
  const rejected = useMemo(() => actions.filter((x) => x.kind === "reject").length, [actions]);
  const total = approved + rejected;

  const topReasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of actions) {
      if (item.kind !== "reject") continue;
      const reason = String(item.reason ?? "").trim();
      if (!reason) continue;
      map.set(reason, (map.get(reason) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => (a.count === b.count ? a.reason.localeCompare(b.reason) : b.count - a.count));
  }, [actions]);

  const hourly = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of actions) {
      const d = new Date(item.at);
      if (Number.isNaN(d.getTime())) continue;
      const h = d.getHours();
      map.set(h, (map.get(h) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
  }, [actions]);

  function copyReport() {
    const lines: string[] = [];
    lines.push("AviSpotters Web Review Session");
    lines.push(`${tr("本次通過", "本次通过", "Session approved")}: ${approved}`);
    lines.push(`${tr("本次拒絕", "本次拒绝", "Session rejected")}: ${rejected}`);
    lines.push(`${tr("本次總操作", "本次总操作", "Session total")}: ${total}`);
    if (topReasons.length) {
      lines.push(`${tr("拒絕原因排行", "拒绝原因排行", "Top reject reasons")}:`);
      topReasons.slice(0, 5).forEach((row, idx) => lines.push(`${idx + 1}. ${row.reason} x${row.count}`));
    }
    if (hourly.length) {
      lines.push(`${tr("時段分佈", "时段分布", "Hourly distribution")}:`);
      lines.push(hourly.map((x) => `${String(x.hour).padStart(2, "0")}:00 x${x.count}`).join(" / "));
    }
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
  }

  function resetSession() {
    writeActions([]);
    setActions([]);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">
        {tr("本次審核分析", "本次审核分析", "Session insights")}
      </div>
      <div className="mt-2 grid gap-2 text-xs text-slate-700 dark:text-slate-200 sm:grid-cols-3">
        <div>{tr("本次通過", "本次通过", "Approved")}: {approved}</div>
        <div>{tr("本次拒絕", "本次拒绝", "Rejected")}: {rejected}</div>
        <div>{tr("本次總操作", "本次总操作", "Total")}: {total}</div>
      </div>
      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        {tr("拒絕原因排行", "拒绝原因排行", "Top reasons")}：
        {topReasons.length
          ? topReasons.slice(0, 3).map((x) => `${x.reason}×${x.count}`).join(" / ")
          : tr("無", "无", "None")}
      </div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        {tr("時段分佈", "时段分布", "Hourly")}：
        {hourly.length
          ? hourly.map((x) => `${String(x.hour).padStart(2, "0")}:00×${x.count}`).join(" / ")
          : tr("無", "无", "None")}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={copyReport}
          disabled={!actions.length}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
        >
          {tr("複製報表", "复制报表", "Copy report")}
        </button>
        <button
          type="button"
          onClick={resetSession}
          disabled={!actions.length}
          className="rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-500/15 disabled:opacity-50 dark:text-red-200"
        >
          {tr("重置本次", "重置本次", "Reset session")}
        </button>
      </div>
    </div>
  );
}

