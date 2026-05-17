"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type Row = {
  registration: string;
  aircraftModel: string | null;
  airline: string | null;
  msn: string | null;
  keywordsJson?: string | null;
  updatedAt: string;
  updatedBy: { name: string | null; email: string } | null;
};

export function AircraftRegistryAdmin() {
  const locale = useClientLocale();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [sort, setSort] = useState<"updatedAt" | "registration" | "aircraftModel" | "airline" | "msn">("updatedAt");
  const [dir, setDir] = useState<"desc" | "asc">("desc");

  const [registration, setRegistration] = useState("");
  const [aircraftModel, setAircraftModel] = useState("");
  const [airline, setAirline] = useState("");
  const [msn, setMsn] = useState("");
  const [keywords, setKeywords] = useState("");
  const [saving, setSaving] = useState(false);

  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: Array<{ line: number; error: string; raw: string }> } | null>(null);

  const importHelp = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Quick import (Super Admin)",
        desc: 'Paste lines. Each line format: Airline*Registration*Model (one column). Example: "Air China*B-32A1*A359".',
        placeholder: "Air China*B-32A1*A359\nJapan Airlines*JA01XJ*Boeing 777-300ER",
        button: "Import",
        importing: "Importing…",
        clear: "Clear",
        ok: (c: number, u: number) => `Done. Created ${c}, updated ${u}.`,
        errTitle: (n: number) => `Errors (${n})`,
        line: (n: number) => `Line ${n}`,
      };
    }
    if (locale === "zh-Hans") {
      return {
        title: "快速导入（仅管理员）",
        desc: '直接粘贴多行文本，每行格式：航空公司*注册号*机型（一栏）。例："国航*B-32A1*A359"。',
        placeholder: "国航*B-32A1*A359\n日航*JA01XJ*Boeing 777-300ER",
        button: "导入",
        importing: "导入中…",
        clear: "清空",
        ok: (c: number, u: number) => `完成：新增 ${c}，更新 ${u}。`,
        errTitle: (n: number) => `错误（${n}）`,
        line: (n: number) => `第 ${n} 行`,
      };
    }
    return {
      title: "快速匯入（僅管理員）",
      desc: '直接貼上多行文字，每行格式：航空公司*註冊號*機型（一欄）。例：「國航*B-32A1*A359」。',
      placeholder: "國航*B-32A1*A359\n日航*JA01XJ*Boeing 777-300ER",
      button: "匯入",
      importing: "匯入中…",
      clear: "清空",
      ok: (c: number, u: number) => `完成：新增 ${c}，更新 ${u}。`,
      errTitle: (n: number) => `錯誤（${n}）`,
      line: (n: number) => `第 ${n} 行`,
    };
  }, [locale]);

  async function refresh(q: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/aircraft?query=${encodeURIComponent(q)}&sort=${encodeURIComponent(sort)}&dir=${encodeURIComponent(dir)}`
      );
      const json = (await res.json()) as { results?: Row[]; error?: string };
      if (!res.ok) throw new Error(json.error || "讀取失敗");
      setRows(Array.isArray(json.results) ? json.results : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, dir]);

  async function onSave() {
    setError(null);
    const reg = registration.trim().toUpperCase();
    if (!reg) {
      setError(locale === "en" ? "Registration is required" : locale === "zh-Hans" ? "请输入注册号" : "請輸入註冊號");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/aircraft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          registration: reg,
          aircraftModel: aircraftModel.trim() || null,
          airline: airline.trim() || null,
          msn: msn.trim() || null,
          keywords: keywords.trim() || null,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || (locale === "en" ? "Save failed" : locale === "zh-Hans" ? "保存失败" : "儲存失敗"));
      setRegistration("");
      setAircraftModel("");
      setAirline("");
      setMsn("");
      setKeywords("");
      await refresh(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : locale === "en" ? "Save failed" : locale === "zh-Hans" ? "保存失败" : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function onImport() {
    setError(null);
    setImportResult(null);
    const text = importText.trim();
    if (!text) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/aircraft/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json()) as
        | { ok: true; created: number; updated: number; errors?: Array<{ line: number; error: string; raw: string }> }
        | { error: string };
      if (!res.ok || !("ok" in json)) {
        const msg =
          "error" in json
            ? json.error
            : locale === "en"
              ? "Import failed"
              : locale === "zh-Hans"
                ? "导入失败"
                : "匯入失敗";
        throw new Error(msg);
      }
      setImportResult({ created: json.created, updated: json.updated, errors: Array.isArray(json.errors) ? json.errors : [] });
      await refresh(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : locale === "en" ? "Import failed" : locale === "zh-Hans" ? "导入失败" : "匯入失敗");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">
          {locale === "en" ? "Aircraft database (prefill by registration)" : locale === "zh-Hans" ? "飞机数据库（注册号自动带出）" : "飛機資料庫（註冊號自動帶出）"}
        </div>
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en"
            ? "Used on upload page: auto-fill model/airline/MSN by registration."
            : locale === "zh-Hans"
              ? "用于上传页：输入注册号后自动带出机型/航司/MSN。"
              : "這裡的資料會用於上傳頁：輸入註冊號後自動帶出機型/航司/MSN。"}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Input
            label={locale === "en" ? "Registration (required)" : locale === "zh-Hans" ? "注册号（必填）" : "註冊號（必填）"}
            value={registration}
            onChange={setRegistration}
            placeholder="B-32A1"
          />
          <Input
            label={locale === "en" ? "Model (optional)" : locale === "zh-Hans" ? "机型（可选）" : "機型（可選）"}
            value={aircraftModel}
            onChange={setAircraftModel}
            placeholder="A359"
          />
          <Input
            label={locale === "en" ? "Airline (optional)" : locale === "zh-Hans" ? "航空公司（可选）" : "航空公司（可選）"}
            value={airline}
            onChange={setAirline}
            placeholder="Air China"
          />
          <Input label={locale === "en" ? "MSN (optional)" : locale === "zh-Hans" ? "MSN（可选）" : "MSN（可選）"} value={msn} onChange={setMsn} placeholder="xxxx" />
        </div>

        <div className="mt-3">
          <Input
            label={locale === "en" ? "Aliases/keywords (optional)" : locale === "zh-Hans" ? "别名/关键词（可选）" : "別名/關鍵字（可選）"}
            value={keywords}
            onChange={setKeywords}
            placeholder={locale === "en" ? "e.g. A350-900, 359, Air China, B-xxxx" : locale === "zh-Hans" ? "例如：A350-900, 359, 国航, B-xxxx" : "例如：A350-900, 359, 國航, B-xxxx"}
          />
        </div>

        {error ? <div className="mt-3 text-sm text-red-700 dark:text-red-200">{error}</div> : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {saving
              ? locale === "en"
                ? "Saving…"
                : locale === "zh-Hans"
                  ? "保存中…"
                  : "儲存中…"
              : locale === "en"
                ? "Save / Update"
                : locale === "zh-Hans"
                  ? "保存/更新"
                  : "儲存/更新"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{importHelp.title}</div>
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">{importHelp.desc}</div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{locale === "en" ? "Paste text" : locale === "zh-Hans" ? "粘贴内容" : "貼上內容"}</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              placeholder={importHelp.placeholder}
            />
          </div>
          <div className="md:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                {locale === "en" ? "Notes" : locale === "zh-Hans" ? "说明" : "說明"}
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>{locale === "en" ? "Delimiter: * (or fullwidth ＊)." : locale === "zh-Hans" ? "分隔符：*（也支持全角＊）。" : "分隔符：*（也支援全形＊）。"}</li>
                <li>{locale === "en" ? "Empty lines and # comments are ignored." : locale === "zh-Hans" ? "空行与 # 注释会忽略。" : "空行與 # 註解會忽略。"}</li>
                <li>{locale === "en" ? "Same registration repeats: last one wins." : locale === "zh-Hans" ? "同一注册号重复：以最后一条为准。" : "同一註冊號重複：以最後一筆為準。"}</li>
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onImport}
                  disabled={importing || !importText.trim()}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {importing ? importHelp.importing : importHelp.button}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportText("");
                    setImportResult(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                >
                  {importHelp.clear}
                </button>
              </div>
            </div>
          </div>
        </div>

        {importResult ? (
          <div className="mt-4 space-y-3">
            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
              {importHelp.ok(importResult.created, importResult.updated)}
            </div>
            {importResult.errors.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                <div className="text-xs font-semibold">{importHelp.errTitle(importResult.errors.length)}</div>
                <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-amber-200/60 bg-white/60 p-2 text-xs dark:border-amber-500/20 dark:bg-black/20">
                  {importResult.errors.slice(0, 100).map((e, idx) => (
                    <div key={`${e.line}-${idx}`} className="font-mono">
                      {importHelp.line(e.line)}: {e.error} · {e.raw}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Search" : locale === "zh-Hans" ? "查询" : "查詢"}</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {locale === "en" ? "Registration / model / airline / MSN." : locale === "zh-Hans" ? "可用注册号/机型/航司/MSN。" : "可用註冊號/機型/航司/MSN。"}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-200">
                {locale === "en" ? "Sort" : locale === "zh-Hans" ? "排序" : "排序"}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              >
                <option value="updatedAt">{locale === "en" ? "Updated" : locale === "zh-Hans" ? "更新" : "更新時間"}</option>
                <option value="registration">{locale === "en" ? "Registration" : locale === "zh-Hans" ? "注册号" : "註冊號"}</option>
                <option value="aircraftModel">{locale === "en" ? "Model" : locale === "zh-Hans" ? "机型" : "機型"}</option>
                <option value="airline">{locale === "en" ? "Airline" : locale === "zh-Hans" ? "航空公司" : "航空公司"}</option>
                <option value="msn">MSN</option>
              </select>
            </label>
            <label className="block">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-200">
                {locale === "en" ? "Direction" : locale === "zh-Hans" ? "方向" : "方向"}
              </div>
              <select
                value={dir}
                onChange={(e) => setDir(e.target.value as any)}
                className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              >
                <option value="desc">{locale === "en" ? "Desc" : locale === "zh-Hans" ? "降序" : "降序"}</option>
                <option value="asc">{locale === "en" ? "Asc" : locale === "zh-Hans" ? "升序" : "升序"}</option>
              </select>
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              placeholder={locale === "en" ? "Keywords" : locale === "zh-Hans" ? "输入关键字" : "輸入關鍵字"}
            />
            <button
              type="button"
              onClick={() => refresh(query)}
              disabled={loading}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              {loading ? (locale === "en" ? "Loading…" : locale === "zh-Hans" ? "查询中…" : "查詢中…") : locale === "en" ? "Search" : locale === "zh-Hans" ? "查询" : "查詢"}
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2">{locale === "en" ? "Registration" : locale === "zh-Hans" ? "注册号" : "註冊號"}</th>
                <th className="px-3 py-2">{locale === "en" ? "Model" : locale === "zh-Hans" ? "机型" : "機型"}</th>
                <th className="px-3 py-2">{locale === "en" ? "Airline" : locale === "zh-Hans" ? "航空公司" : "航空公司"}</th>
                <th className="px-3 py-2">MSN</th>
                <th className="px-3 py-2">{locale === "en" ? "Photos" : locale === "zh-Hans" ? "照片" : "照片"}</th>
                <th className="px-3 py-2">{locale === "en" ? "Updated" : locale === "zh-Hans" ? "更新" : "更新"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const by = r.updatedBy ? r.updatedBy.name ?? r.updatedBy.email : "—";
                return (
                  <tr key={r.registration} className="border-t border-slate-200 dark:border-white/10">
                    <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{r.registration}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.aircraftModel ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.airline ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.msn ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      <a
                        href={`/photos?q=${encodeURIComponent(r.registration)}`}
                        className="font-semibold text-sky-700 hover:underline dark:text-sky-300"
                      >
                        {locale === "en" ? "View →" : locale === "zh-Hans" ? "查看 →" : "查看 →"}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      {new Date(r.updatedAt).toLocaleString()} · {by}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
        placeholder={placeholder}
      />
    </label>
  );
}

