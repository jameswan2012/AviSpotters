"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/shared";

type AirlineRow = {
  id: string;
  iata: string | null;
  icao: string | null;
  nameZh: string | null;
  nameEn: string | null;
  keywordsJson: string | null;
  notes: string | null;
  updatedAt: string | Date;
};

function parseKeywordsText(keywordsJson: string | null) {
  if (!keywordsJson) return "";
  try {
    const arr = JSON.parse(keywordsJson) as unknown;
    if (!Array.isArray(arr)) return "";
    return arr.filter((x) => typeof x === "string").join(", ");
  } catch {
    return "";
  }
}

export function AirlineAdmin({ initialRows, canEdit, locale }: { initialRows: AirlineRow[]; canEdit: boolean; locale: Locale }) {
  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);

  const [rows, setRows] = useState<AirlineRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");

  const [form, setForm] = useState({
    iata: "",
    icao: "",
    nameZh: "",
    nameEn: "",
    keywords: "",
    notes: "",
  });

  async function refresh(nextQuery: string) {
    const res = await fetch(`/api/admin/airlines?query=${encodeURIComponent(nextQuery)}`);
    const json = (await res.json()) as { airlines?: AirlineRow[] };
    setRows(Array.isArray(json.airlines) ? json.airlines : []);
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    await refresh(query.trim());
  }

  async function onSave() {
    if (!canEdit || saving) return;
    setError(null);
    setOk(null);
    try {
      setSaving(true);
      const res = await fetch("/api/admin/airlines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          iata: form.iata.trim() || null,
          icao: form.icao.trim() || null,
          nameZh: form.nameZh.trim() || null,
          nameEn: form.nameEn.trim() || null,
          keywords: form.keywords.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      const json = (await res.json()) as { airline?: AirlineRow; error?: string };
      if (!res.ok || !json.airline) throw new Error(json.error || tr("儲存失敗", "保存失败", "Save failed"));
      setOk(tr("已儲存", "已保存", "Saved"));
      setForm({ iata: "", icao: "", nameZh: "", nameEn: "", keywords: "", notes: "" });
      await refresh(query.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("儲存失敗", "保存失败", "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function onBulkImport() {
    if (!canEdit || importing) return;
    setError(null);
    setOk(null);
    try {
      setImporting(true);
      const res = await fetch("/api/admin/airlines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "bulk_import",
          rowsText: bulkText,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        imported?: number;
        skipped?: number;
        errors?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || tr("導入失敗", "导入失败", "Import failed"));
      const imported = Number(json.imported || 0);
      const skipped = Number(json.skipped || 0);
      const errs = Array.isArray(json.errors) && json.errors.length ? `; ${json.errors.join(" | ")}` : "";
      setOk(tr(`导入完成：成功 ${imported}，跳过 ${skipped}${errs}`, `导入完成：成功 ${imported}，跳过 ${skipped}${errs}`, `Import done: ${imported} imported, ${skipped} skipped${errs}`));
      await refresh(query.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("導入失敗", "导入失败", "Import failed"));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr("搜尋：IATA/ICAO/名稱/別名", "搜索：IATA/ICAO/名称/别名", "Search: IATA/ICAO/name/aliases")}
          className="w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
        />
        <button type="submit" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
          {tr("搜尋", "搜索", "Search")}
        </button>
      </form>

      {canEdit ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("新增/更新航空公司", "新增/更新航空公司", "Add / update airline")}</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={form.nameZh} onChange={(e) => setForm((s) => ({ ...s, nameZh: e.target.value }))} placeholder={tr("中文名（可選）", "中文名（可选）", "Chinese name (optional)")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-white" />
            <input value={form.nameEn} onChange={(e) => setForm((s) => ({ ...s, nameEn: e.target.value }))} placeholder={tr("英文名（可選）", "英文名（可选）", "English name (optional)")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-white" />
            <input value={form.iata} onChange={(e) => setForm((s) => ({ ...s, iata: e.target.value }))} placeholder="IATA（2-3碼，可選）" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-white" />
            <input value={form.icao} onChange={(e) => setForm((s) => ({ ...s, icao: e.target.value }))} placeholder="ICAO（3碼，可選）" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-white" />
            <input value={form.keywords} onChange={(e) => setForm((s) => ({ ...s, keywords: e.target.value }))} placeholder={tr("關鍵字/別名（逗號分隔）", "关键词/别名（逗号分隔）", "Aliases/keywords (comma separated)")} className="md:col-span-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-white" />
            <input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder={tr("備註（可選）", "备注（可选）", "Notes (optional)")} className="md:col-span-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-white" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={onSave} type="button" disabled={saving} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60">
              {saving ? tr("儲存中…", "保存中…", "Saving…") : tr("儲存", "保存", "Save")}
            </button>
            {ok ? <div className="text-sm text-emerald-700 dark:text-emerald-200">{ok}</div> : null}
            {error ? <div className="text-sm text-red-700 dark:text-red-200">{error}</div> : null}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-sky-950/30">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {tr("一鍵導入（每行一條）", "一键导入（每行一条）", "Bulk import (one line each)")}
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {tr(
                "格式：中文名*英文名*IATA*ICAO*关键词（关键词可留空）",
                "格式：中文名*英文名*IATA*ICAO*关键词（关键词可留空）",
                "Format: Chinese*English*IATA*ICAO*keywords (keywords optional)"
              )}
            </div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={6}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
              placeholder={"中国国际航空*Air China*CA*CCA*国航,airchina\n中国南方航空*China Southern Airlines*CZ*CSN*南航,csair"}
            />
            <div className="mt-2">
              <button
                type="button"
                onClick={() => void onBulkImport()}
                disabled={importing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                {importing ? tr("導入中…", "导入中…", "Importing…") : tr("一鍵導入", "一键导入", "Import")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-700 dark:text-slate-200">{tr("你目前為只讀（審核員可看但不可修改）", "你目前为只读（审核员可看但不可修改）", "Read-only (reviewers can view; admins can edit).")}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-200">
            <tr>
              <th className="px-4 py-3">IATA</th>
              <th className="px-4 py-3">ICAO</th>
              <th className="px-4 py-3">{tr("中文名", "中文名", "Chinese")}</th>
              <th className="px-4 py-3">{tr("英文名", "英文名", "English")}</th>
              <th className="px-4 py-3">{tr("別名/關鍵字", "别名/关键词", "Aliases")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {rows.map((r) => (
              <tr key={r.id} className="text-slate-900 dark:text-slate-100">
                <td className="px-4 py-3 font-extrabold tracking-wider text-sky-700 dark:text-sky-200">{r.iata ?? "—"}</td>
                <td className="px-4 py-3 font-extrabold tracking-wider text-sky-700 dark:text-sky-200">{r.icao ?? "—"}</td>
                <td className="px-4 py-3">{r.nameZh ?? "—"}</td>
                <td className="px-4 py-3">{r.nameEn ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{parseKeywordsText(r.keywordsJson) || "—"}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-700 dark:text-slate-200" colSpan={5}>
                  {tr("沒有資料。", "没有数据。", "No data.")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

