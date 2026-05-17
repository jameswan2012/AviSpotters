"use client";

import { useMemo, useState } from "react";

type TicketRow = {
  id: string;
  email: string;
  body: string;
  status: string;
  staffReply: string | null;
  resolvedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function fmt(v: string | Date | null | undefined) {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function TicketsAdmin({ locale, canEdit, initialRows }: { locale: "zh-Hant" | "zh-Hans" | "en"; canEdit: boolean; initialRows: TicketRow[] }) {
  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);

  const [rows, setRows] = useState<TicketRow[]>(initialRows);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/tickets");
    const json = (await res.json().catch(() => ({}))) as { tickets?: TicketRow[] };
    setRows(Array.isArray(json.tickets) ? json.tickets : []);
  }

  async function save(id: string, staffReply: string, close: boolean) {
    if (!canEdit || savingId) return;
    setError(null);
    setOk(null);
    try {
      setSavingId(id);
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, staffReply, close }),
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }
      if (!res.ok) throw new Error(json.error || tr("操作失敗", "操作失败", "Operation failed"));
      setOk(tr("已更新", "已更新", "Updated"));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("操作失敗", "操作失败", "Operation failed"));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {!canEdit ? <div className="text-sm text-slate-700 dark:text-slate-200">{tr("只讀（管理員以上可操作）", "只读（管理员以上可操作）", "Read-only")}</div> : null}
      {ok ? <div className="text-sm text-emerald-700 dark:text-emerald-200">{ok}</div> : null}
      {error ? <div className="text-sm text-red-700 dark:text-red-200">{error}</div> : null}

      <div className="grid gap-3">
        {rows.map((r) => (
          <TicketCard key={r.id} row={r} locale={locale} canEdit={canEdit} saving={savingId === r.id} onSave={save} />
        ))}
        {!rows.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            {tr("沒有工單。", "没有工单。", "No tickets.")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TicketCard({
  row,
  locale,
  canEdit,
  saving,
  onSave,
}: {
  row: TicketRow;
  locale: "zh-Hant" | "zh-Hans" | "en";
  canEdit: boolean;
  saving: boolean;
  onSave: (id: string, staffReply: string, close: boolean) => Promise<void>;
}) {
  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  const [reply, setReply] = useState(row.staffReply ?? "");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{row.email}</div>
        <span
          className={[
            "inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold",
            row.status === "closed"
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
              : "border-amber-400/20 bg-amber-500/10 text-amber-800 dark:text-amber-200",
          ].join(" ")}
        >
          {row.status === "closed" ? tr("已結案", "已结案", "Closed") : tr("處理中", "处理中", "Open")}
        </span>
      </div>
      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        {tr("建立：", "创建：", "Created: ")}
        {fmt(row.createdAt)} · {tr("更新：", "更新：", "Updated: ")}
        {fmt(row.updatedAt)}
        {row.resolvedAt ? (
          <>
            {" "}
            · {tr("結案：", "结案：", "Resolved: ")}
            {fmt(row.resolvedAt)}
          </>
        ) : null}
      </div>

      <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
        {row.body}
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("管理員回覆（可選）", "管理员回复（可选）", "Staff reply (optional)")}</div>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          placeholder={tr("回覆內容…", "回复内容…", "Reply…")}
          disabled={!canEdit}
        />
      </div>

      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave(row.id, reply, false)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {saving ? tr("處理中…", "处理中…", "Working…") : tr("保存回覆", "保存回复", "Save reply")}
          </button>
          {row.status !== "closed" ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave(row.id, reply, true)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? tr("處理中…", "处理中…", "Working…") : tr("保存並結案", "保存并结案", "Save & close")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

