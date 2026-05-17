"use client";

import { useEffect, useMemo, useState } from "react";

function fmtDurationMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  return { days, hours, mins };
}

export function HomePopup({
  locale,
  news,
  uptimeStartIso,
  suppress,
}: {
  locale: "zh-Hant" | "zh-Hans" | "en";
  news: { id: string; title: string; body: string | null; imageUrl: string | null } | null;
  uptimeStartIso: string; // e.g. 2026-02-24T00:00:00.000Z
  suppress?: boolean;
}) {
  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);

  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (suppress) return;
    // Don't show every time user navigates back to home.
    // Show once per day per "news id" (or uptime when no news).
    try {
      const key = `avispotters_home_popup_seen:${news?.id ?? "uptime"}`;
      const raw = window.localStorage.getItem(key);
      const last = raw ? Number(raw) : 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const shouldOpen = !(Number.isFinite(last) && last >= today.getTime());
      setOpen(shouldOpen);
    } catch {
      setOpen(true);
    }
  }, [news?.id, suppress]);

  function close() {
    setOpen(false);
    try {
      const key = `avispotters_home_popup_seen:${news?.id ?? "uptime"}`;
      window.localStorage.setItem(key, String(Date.now()));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!open || news || suppress) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [open, news, suppress]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || suppress) return null;

  const uptimeStart = new Date(uptimeStartIso).getTime();
  const dur = fmtDurationMs(now - uptimeStart);

  return (
    <div
      className="fixed inset-0 z-[40] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-sky-950">
        {news?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={news.imageUrl} alt={news.title} className="h-56 w-full object-cover" />
        ) : null}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {news ? news.title : tr("本站已上線", "本站已上线", "Site uptime")}
            </div>
            <button
              type="button"
              onClick={close}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              aria-label={tr("關閉", "关闭", "Close")}
              title={tr("關閉", "关闭", "Close")}
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {news ? (
              news.body ? (
                <div className="whitespace-pre-wrap">{news.body}</div>
              ) : (
                <div>{tr("（無內容）", "（无内容）", "(No content)")}</div>
              )
            ) : (
              <div>
                {tr(
                  `自 2026/02/24 起已運行 ${dur.days} 天 ${dur.hours} 小時 ${dur.mins} 分鐘。`,
                  `自 2026/02/24 起已运行 ${dur.days} 天 ${dur.hours} 小时 ${dur.mins} 分钟。`,
                  `Running since 2026-02-24: ${dur.days}d ${dur.hours}h ${dur.mins}m.`
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400"
            >
              {tr("我知道了", "我知道了", "OK")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

