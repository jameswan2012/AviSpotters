"use client";

import { useState } from "react";
import Link from "next/link";
import { useClientLocale } from "@/i18n/client-locale";

type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  status: string;
  message: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
};

export function ReportReviewTable({ initialReports }: { initialReports: ReportRow[] }) {
  const locale = useClientLocale();
  const [rows, setRows] = useState(() =>
    initialReports.map((r) => ({
      ...r,
      loading: false,
      error: null as string | null,
    })),
  );

  async function decide(id: string, status: "kept" | "deleted") {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, loading: true, error: null } : r)));
    try {
      const res = await fetch(`/api/admin/reports/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || (locale === "en" ? "Failed" : locale === "zh-Hans" ? "操作失败" : "操作失敗"));
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, loading: false, error: e instanceof Error ? e.message : locale === "en" ? "Failed" : locale === "zh-Hans" ? "操作失败" : "操作失敗" }
            : r
        )
      );
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
      <div className="divide-y divide-slate-200 dark:divide-white/10">
        {rows.map((r) => {
          const author = r.user.name ?? r.user.email;
          return (
            <div key={r.id} className="p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {locale === "en" ? "Target" : locale === "zh-Hans" ? "举报目标" : "舉報目標"}：{r.targetType} ·{" "}
                    {r.targetType === "photo" ? (
                      <Link href={`/photos/${encodeURIComponent(r.targetId)}`} className="text-sky-300 hover:underline">
                        {r.targetId}
                      </Link>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200">{r.targetId}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{author}</div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{r.message}</div>
                </div>

                <div className="w-full lg:w-[340px]">
                  {r.error ? <div className="text-sm text-red-700 dark:text-red-200">{r.error}</div> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={r.loading}
                      onClick={() => decide(r.id, "kept")}
                      className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {locale === "en" ? "Approve (keep)" : locale === "zh-Hans" ? "通过（保留数据）" : "通過（保留資料）"}
                    </button>
                    <button
                      type="button"
                      disabled={r.loading}
                      onClick={() => decide(r.id, "deleted")}
                      className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/15 disabled:opacity-60"
                    >
                      {locale === "en" ? "Reject (delete)" : locale === "zh-Hans" ? "不通过（删除数据）" : "不通過（刪除資料）"}
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">
                    {locale === "en"
                      ? "Rule: approve → keep data; reject → delete data."
                      : locale === "zh-Hans"
                        ? "当前规则：通过 → 无事发生；不通过 → 删除数据。"
                        : "你目前的規則：通過 → 無事發生；不通過 → 刪除資料。"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!rows.length ? (
          <div className="p-6 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "No pending reports." : locale === "zh-Hans" ? "目前没有待处理举报。" : "目前沒有待處理舉報。"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

