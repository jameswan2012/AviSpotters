"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type Payload = {
  displayName: string;
  keywords: string;
  hidden: boolean;
  summary: string;
  rangeKm: string;
  cruiseSpeedKmh: string;
  mtowKg: string;
  engines: string;
  operators: string;
  images: string;
  notes: string;
};

export function ModelOverrideForm({
  manufacturerId,
  familyId,
  modelId,
  canEdit,
}: {
  manufacturerId: string;
  familyId: string;
  modelId: string;
  canEdit: boolean;
}) {
  const locale = useClientLocale();
  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [initial, setInitial] = useState<Payload | null>(null);
  const [form, setForm] = useState<Payload>({
    displayName: "",
    keywords: "",
    hidden: false,
    summary: "",
    rangeKm: "",
    cruiseSpeedKmh: "",
    mtowKg: "",
    engines: "",
    operators: "",
    images: "",
    notes: "",
  });

  const apiBase = useMemo(
    () =>
      `/api/admin/models/${encodeURIComponent(manufacturerId)}/${encodeURIComponent(familyId)}/${encodeURIComponent(
        modelId
      )}`,
    [manufacturerId, familyId, modelId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiBase);
        const data = (await res.json()) as any;
        if (!res.ok) throw new Error(data.error || tr("載入失敗", "加载失败", "Load failed"));
        const payload: Payload = {
          displayName: data.displayName ?? "",
          keywords: Array.isArray(data.keywords) ? data.keywords.join("\n") : "",
          hidden: !!data.hidden,
          summary: data.summary ?? "",
          rangeKm: data.rangeKm != null ? String(data.rangeKm) : "",
          cruiseSpeedKmh: data.cruiseSpeedKmh != null ? String(data.cruiseSpeedKmh) : "",
          mtowKg: data.mtowKg != null ? String(data.mtowKg) : "",
          engines: Array.isArray(data.engines) ? data.engines.join("\n") : "",
          operators: Array.isArray(data.majorOperators) ? data.majorOperators.join("\n") : "",
          images: Array.isArray(data.images) ? data.images.join("\n") : "",
          notes: data.manufacturersNotes ?? "",
        };
        if (cancelled) return;
        setInitial(payload);
        setForm(payload);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? tr("載入失敗", "加载失败", "Load failed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, tr]);

  async function save() {
    setOk(null);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName || null,
          keywords: splitLines(form.keywords),
          hidden: !!form.hidden,
          summary: form.summary || null,
          rangeKm: form.rangeKm ? Number(form.rangeKm) : null,
          cruiseSpeedKmh: form.cruiseSpeedKmh ? Number(form.cruiseSpeedKmh) : null,
          mtowKg: form.mtowKg ? Number(form.mtowKg) : null,
          engines: splitLines(form.engines),
          operators: splitLines(form.operators),
          images: splitLines(form.images),
          notes: form.notes || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || tr("儲存失敗", "保存失败", "Save failed"));
      setOk(tr("已儲存", "已保存", "Saved"));
    } catch (e: any) {
      setError(e?.message ?? tr("儲存失敗", "保存失败", "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride() {
    if (!canEdit || saving) return;
    const ok = window.confirm(
      tr(
        "確定要清除這個機型的後台覆寫嗎？（會回到原始 JSON 資料）",
        "确定要清除这个机型的后台覆写吗？（会回到原始 JSON 数据）",
        "Clear override for this model? (Revert to base JSON)"
      )
    );
    if (!ok) return;
    setOk(null);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(apiBase, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || tr("操作失敗", "操作失败", "Action failed"));
      // Reload
      const res2 = await fetch(apiBase);
      const data2 = (await res2.json()) as any;
      if (!res2.ok) throw new Error(data2.error || tr("載入失敗", "加载失败", "Load failed"));
      const payload: Payload = {
        displayName: data2.displayName ?? "",
        keywords: Array.isArray(data2.keywords) ? data2.keywords.join("\n") : "",
        hidden: !!data2.hidden,
        summary: data2.summary ?? "",
        rangeKm: data2.rangeKm != null ? String(data2.rangeKm) : "",
        cruiseSpeedKmh: data2.cruiseSpeedKmh != null ? String(data2.cruiseSpeedKmh) : "",
        mtowKg: data2.mtowKg != null ? String(data2.mtowKg) : "",
        engines: Array.isArray(data2.engines) ? data2.engines.join("\n") : "",
        operators: Array.isArray(data2.majorOperators) ? data2.majorOperators.join("\n") : "",
        images: Array.isArray(data2.images) ? data2.images.join("\n") : "",
        notes: data2.manufacturersNotes ?? "",
      };
      setInitial(payload);
      setForm(payload);
      setOk(tr("已清除覆寫", "已清除覆写", "Override cleared"));
    } catch (e: any) {
      setError(e?.message ?? tr("操作失敗", "操作失败", "Action failed"));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (initial) setForm(initial);
    setOk(null);
    setError(null);
  }

  if (loading) return <div className="text-sm text-slate-700 dark:text-slate-200">{tr("載入中…", "加载中…", "Loading…")}</div>;
  if (error) return <div className="text-sm text-red-700 dark:text-red-200">{error}</div>;

  return (
    <div className="space-y-4">
      {!canEdit ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-200">
          {tr("你目前僅能檢視（審核員暫無操作權限）。", "你目前仅能查看（审核员暂无操作权限）。", "Read-only (no permission to edit).")}
        </div>
      ) : null}

      <Field label={tr("顯示名稱（可選）", "显示名称（可选）", "Display name (optional)")}>
        <input
          value={form.displayName}
          onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
          className={inputClass}
          disabled={!canEdit}
          placeholder={tr("例如：A330-941", "例如：A330-941", "e.g. A330-941")}
        />
        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {tr(
            "會覆蓋前台/搜尋顯示用名稱，不會改動原始 JSON 的 modelId。",
            "会覆盖前台/搜索显示用名称，不会改动原始 JSON 的 modelId。",
            "Overrides display name in UI/search; does not change the base JSON modelId."
          )}
        </div>
      </Field>

      <Field label={tr("關鍵詞（每行一個）", "关键词（每行一个）", "Keywords (one per line)")}>
        <textarea
          value={form.keywords}
          onChange={(e) => setForm((p) => ({ ...p, keywords: e.target.value }))}
          rows={4}
          className={inputClass}
          disabled={!canEdit}
          placeholder={tr("例如：A330neo", "例如：A330neo", "e.g. A330neo")}
        />
        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {tr(
            "會加入機型搜尋與識別關鍵字（自動轉小寫並去重）。",
            "会加入机型搜索与识别关键词（自动转小写并去重）。",
            "Used by model search and identify keywords (lowercased and deduplicated)."
          )}
        </div>
      </Field>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-sky-50 p-4 dark:border-white/10 dark:bg-sky-950/30">
        <input
          type="checkbox"
          checked={!!form.hidden}
          onChange={(e) => setForm((p) => ({ ...p, hidden: e.target.checked }))}
          disabled={!canEdit}
          className="mt-1 h-4 w-4"
        />
        <div className="text-sm leading-6 text-slate-700 dark:text-slate-200">
          <span className="font-extrabold text-sky-700 dark:text-sky-200">{tr("從前台隱藏（等同刪除）", "从前台隐藏（等同删除）", "Hide from public (acts like delete)")}</span>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {tr(
              "隱藏後：前台機型列表/搜尋不再顯示，機型頁面也會 404；後台仍可進入調整並可取消隱藏。",
              "隐藏后：前台机型列表/搜索不再显示，机型页面也会 404；后台仍可进入调整并可取消隐藏。",
              "When hidden: removed from public list/search and model page returns 404; admins can still edit and unhide."
            )}
          </div>
        </div>
      </label>

      <Field label={tr("摘要（summary）", "摘要（summary）", "Summary (summary)")}>
        <textarea
          value={form.summary}
          onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
          rows={3}
          className={inputClass}
          disabled={!canEdit}
        />
      </Field>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label={tr("航程（km）", "航程（km）", "Range (km)")}>
          <input
            value={form.rangeKm}
            onChange={(e) => setForm((p) => ({ ...p, rangeKm: e.target.value }))}
            className={inputClass}
            disabled={!canEdit}
          />
        </Field>
        <Field label={tr("巡航（km/h）", "巡航（km/h）", "Cruise (km/h)")}>
          <input
            value={form.cruiseSpeedKmh}
            onChange={(e) => setForm((p) => ({ ...p, cruiseSpeedKmh: e.target.value }))}
            className={inputClass}
            disabled={!canEdit}
          />
        </Field>
        <Field label={tr("MTOW（kg）", "MTOW（kg）", "MTOW (kg)")}>
          <input
            value={form.mtowKg}
            onChange={(e) => setForm((p) => ({ ...p, mtowKg: e.target.value }))}
            className={inputClass}
            disabled={!canEdit}
          />
        </Field>
      </div>

      <Field label={tr("引擎（每行一個）", "发动机（每行一个）", "Engines (one per line)")}>
        <textarea
          value={form.engines}
          onChange={(e) => setForm((p) => ({ ...p, engines: e.target.value }))}
          rows={4}
          className={inputClass}
          disabled={!canEdit}
        />
      </Field>

      <Field label={tr("營運商（每行一個）", "运营商（每行一个）", "Operators (one per line)")}>
        <textarea
          value={form.operators}
          onChange={(e) => setForm((p) => ({ ...p, operators: e.target.value }))}
          rows={4}
          className={inputClass}
          disabled={!canEdit}
        />
      </Field>

      <Field label={tr("圖片 URL（每行一個）", "图片 URL（每行一个）", "Image URLs (one per line)")}>
        <textarea
          value={form.images}
          onChange={(e) => setForm((p) => ({ ...p, images: e.target.value }))}
          rows={4}
          className={inputClass}
          disabled={!canEdit}
        />
      </Field>

      <Field label={tr("備註（manufacturersNotes）", "备注（manufacturersNotes）", "Notes (manufacturersNotes)")}>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={4}
          className={inputClass}
          disabled={!canEdit}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canEdit || saving}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {saving ? tr("儲存中…", "保存中…", "Saving…") : tr("儲存覆寫", "保存覆写", "Save override")}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={!canEdit}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
        >
          {tr("還原", "还原", "Reset")}
        </button>
        <button
          type="button"
          onClick={clearOverride}
          disabled={!canEdit || saving}
          className="rounded-lg border border-red-300/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-500/15 disabled:opacity-60 dark:text-red-100"
        >
          {tr("清除覆寫", "清除覆写", "Clear override")}
        </button>
        {ok ? <span className="text-sm text-emerald-700 dark:text-emerald-200">{ok}</span> : null}
        {error ? <span className="text-sm text-red-700 dark:text-red-200">{error}</span> : null}
      </div>
    </div>
  );
}

function splitLines(s: string): string[] {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</div>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 disabled:opacity-60 dark:border-white/10 dark:bg-sky-950/50 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-sky-400/40";

