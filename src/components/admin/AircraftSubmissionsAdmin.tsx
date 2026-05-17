"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type Row = {
  id: string;
  registration: string;
  aircraftModel: string | null;
  airline: string | null;
  msn: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  submittedBy: { name: string | null; email: string };
};

export function AircraftSubmissionsAdmin() {
  const locale = useClientLocale();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => `/api/admin/aircraft/submissions?status=${encodeURIComponent(status)}`, [status]);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      const json = (await res.json()) as { results?: Row[]; error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Load failed" : locale === "zh-Hans" ? "读取失败" : "讀取失敗")
        );
      setRows(Array.isArray(json.results) ? json.results : []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : locale === "en" ? "Load failed" : locale === "zh-Hans" ? "读取失败" : "讀取失敗"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function act(id: string, action: "approve" | "reject") {
    setError(null);
    try {
      const res = await fetch("/api/admin/aircraft/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Action failed" : locale === "zh-Hans" ? "操作失败" : "操作失敗")
        );
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : locale === "en" ? "Action failed" : locale === "zh-Hans" ? "操作失败" : "操作失敗"
      );
    }
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {locale === "en"
                ? "Submissions: registration prefill data"
                : locale === "zh-Hans"
                  ? "摄影师提交：注册号自动填充数据"
                  : "攝影師提交：註冊號自動填充資料"}
            </div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {locale === "en"
                ? 'After approval, it will be written into the "registration prefill DB".'
                : locale === "zh-Hans"
                  ? "审核通过后，会写入「注册号 prefill DB」。"
                  : "審核通過後，會寫入「註冊號 prefill DB」。"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus((e.target.value as any) || "pending")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            >
              <option value="pending">{locale === "en" ? "Pending" : locale === "zh-Hans" ? "待审" : "待審"}</option>
              <option value="approved">{locale === "en" ? "Approved" : locale === "zh-Hans" ? "已通过" : "已通過"}</option>
              <option value="rejected">{locale === "en" ? "Rejected" : locale === "zh-Hans" ? "已拒绝" : "已拒絕"}</option>
            </select>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {loading ? (locale === "en" ? "Refreshing…" : locale === "zh-Hans" ? "更新中…" : "更新中…") : locale === "en" ? "Refresh" : locale === "zh-Hans" ? "刷新" : "重新整理"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{r.registration}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {locale === "en" ? "Submitter" : locale === "zh-Hans" ? "提交者" : "提交者"}：
                  {r.submittedBy.name ? `${r.submittedBy.name}（${r.submittedBy.email}）` : r.submittedBy.email} · {new Date(r.createdAt).toLocaleString()}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <KV k={locale === "en" ? "Model" : locale === "zh-Hans" ? "机型" : "機型"} v={r.aircraftModel ?? "—"} />
                  <KV k={locale === "en" ? "Airline" : locale === "zh-Hans" ? "航空公司" : "航空公司"} v={r.airline ?? "—"} />
                  <KV k="MSN" v={r.msn ?? "—"} />
                  <KV k={locale === "en" ? "Note" : locale === "zh-Hans" ? "备注" : "備註"} v={r.note ?? "—"} />
                </div>
              </div>

              {status === "pending" ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => act(r.id, "approve")}
                    className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300"
                  >
                    {locale === "en" ? "Approve" : locale === "zh-Hans" ? "通过" : "通過"}
                  </button>
                  <button
                    type="button"
                    onClick={() => act(r.id, "reject")}
                    className="rounded-xl bg-red-400 px-3 py-2 text-sm font-semibold text-red-950 hover:bg-red-300"
                  >
                    {locale === "en" ? "Reject" : locale === "zh-Hans" ? "拒绝" : "拒絕"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {!rows.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            {locale === "en" ? "No data." : locale === "zh-Hans" ? "目前没有数据。" : "目前沒有資料。"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-sky-50 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-200">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{k}：</span>
      <span className="ml-1 font-semibold text-slate-900 dark:text-white">{v}</span>
    </div>
  );
}

