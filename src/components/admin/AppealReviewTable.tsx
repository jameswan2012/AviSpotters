"use client";

import { useState } from "react";
import Link from "next/link";
import { useClientLocale } from "@/i18n/client-locale";

type AppealRow = {
  id: string;
  status: string;
  message: string;
  staffReply: string | null;
  createdAt: string;
  photo: { id: string; registration: string; title: string | null; status: string; user: { id: string; email: string; name: string | null } };
  user: { id: string; email: string; name: string | null };
};

export function AppealReviewTable({ initialAppeals }: { initialAppeals: AppealRow[] }) {
  const locale = useClientLocale();
  const [rows, setRows] = useState(() =>
    initialAppeals.map((r) => ({
      ...r,
      staffReplyDraft: r.staffReply ?? "",
      loading: false,
      error: null as string | null,
    })),
  );

  async function decide(id: string, status: "accepted" | "dismissed") {
    let staffReply = "";
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        staffReply = (r.staffReplyDraft ?? "").trim();
        return { ...r, loading: true, error: null };
      }),
    );
    try {
      const res = await fetch(`/api/admin/appeals/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, staffReply: staffReply || null }),
      });
      const json = (await res.json()) as { error?: string; warning?: string; requireConfirm?: boolean };
      if (!res.ok) {
        if (res.status === 409 && json?.requireConfirm && status === "dismissed") {
          const ok = window.confirm(
            json.warning ||
              (locale === "en"
                ? "Dismiss reply is too generic. If you continue, admin will be notified."
                : locale === "zh-Hans"
                  ? "驳回回复过于笼统；若继续提交，系统会通知管理员。"
                  : "駁回回覆過於籠統；若繼續提交，系統會通知管理員。")
          );
          if (!ok) {
            setRows((prev) => prev.map((r) => (r.id === id ? { ...r, loading: false } : r)));
            return;
          }
          const retry = await fetch(`/api/admin/appeals/${encodeURIComponent(id)}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status, staffReply: staffReply || null, forceDismissConfirm: true }),
          });
          const retryJson = (await retry.json().catch(() => ({}))) as { error?: string };
          if (!retry.ok) throw new Error(retryJson.error || (locale === "en" ? "Failed" : locale === "zh-Hans" ? "操作失败" : "操作失敗"));
        } else {
          throw new Error(json.error || (locale === "en" ? "Failed" : locale === "zh-Hans" ? "操作失败" : "操作失敗"));
        }
      }
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
          const photoLabel = r.photo.title ?? r.photo.registration;
          return (
            <div key={r.id} className="p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    <Link href={`/photos/${encodeURIComponent(r.photo.id)}`} className="hover:underline">
                      {photoLabel}
                    </Link>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{author}</div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{r.message}</div>
                </div>

                <div className="w-full lg:w-[360px]">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                    {locale === "en" ? "Reply (optional)" : locale === "zh-Hans" ? "回复（可选）" : "回覆（選填）"}
                  </div>
                  <textarea
                    value={r.staffReplyDraft}
                    onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, staffReplyDraft: e.target.value } : x)))}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-sky-400/40"
                    placeholder={locale === "en" ? "Reply to the photographer…" : locale === "zh-Hans" ? "给摄影师的回复…" : "給攝影師的回覆…"}
                  />

                  {r.error ? <div className="mt-2 text-sm text-red-700 dark:text-red-200">{r.error}</div> : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={r.loading}
                      onClick={() => decide(r.id, "accepted")}
                      className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {locale === "en" ? "Accept (back to pending)" : locale === "zh-Hans" ? "受理（回到待审）" : "受理（回到待審）"}
                    </button>
                    <button
                      type="button"
                      disabled={r.loading}
                      onClick={() => decide(r.id, "dismissed")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                    >
                      {locale === "en" ? "Dismiss" : locale === "zh-Hans" ? "驳回" : "駁回"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!rows.length ? (
          <div className="p-6 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "No pending appeals." : locale === "zh-Hans" ? "目前没有待处理申诉。" : "目前沒有待處理申訴。"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

