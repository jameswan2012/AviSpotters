"use client";

import { useMemo, useState } from "react";

type Q = {
  id: string;
  order: number;
  active: boolean;
  promptJson: string;
  imagePath: string | null;
  imageMime: string | null;
  imageSizeBytes: number | null;
  updatedAt: string;
};

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function buildPromptJson(zhHant: string, zhHans: string, en: string) {
  return JSON.stringify({ zhHant: zhHant.trim(), zhHans: zhHans.trim(), en: en.trim() });
}

function promptFor(locale: "zh-Hant" | "zh-Hans" | "en", promptJson: string) {
  const obj = safeParse<{ zhHant?: string; zhHans?: string; en?: string }>(promptJson, {});
  if (locale === "en") return (obj.en ?? obj.zhHant ?? obj.zhHans ?? "").trim();
  if (locale === "zh-Hans") return (obj.zhHans ?? obj.zhHant ?? obj.en ?? "").trim();
  return (obj.zhHant ?? obj.zhHans ?? obj.en ?? "").trim();
}

export function StaffApplicationQuestionsAdmin({
  locale,
  initialQuestions,
}: {
  locale: "zh-Hant" | "zh-Hans" | "en";
  initialQuestions: any[];
}) {
  const [qs, setQs] = useState<Q[]>(
    (initialQuestions || []).map((q) => ({
      id: String(q.id),
      order: Number(q.order || 0),
      active: Boolean(q.active),
      promptJson: String(q.promptJson || "{}"),
      imagePath: q.imagePath ?? null,
      imageMime: q.imageMime ?? null,
      imageSizeBytes: q.imageSizeBytes ?? null,
      updatedAt: String(q.updatedAt),
    }))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const newDefaults = useMemo(() => {
    return {
      order: (qs.reduce((m, q) => Math.max(m, q.order), 0) || 0) + 10,
      zhHant: "",
      zhHans: "",
      en: "",
      active: true,
    };
  }, [qs]);

  async function refresh() {
    const res = await fetch("/api/admin/staff-application/questions", { method: "GET" });
    const data = (await res.json().catch(() => ({}))) as { questions?: any[]; error?: string };
    if (!res.ok) throw new Error(data.error || "refresh_failed");
    setQs(
      (data.questions || []).map((q) => ({
        id: String(q.id),
        order: Number(q.order || 0),
        active: Boolean(q.active),
        promptJson: String(q.promptJson || "{}"),
        imagePath: q.imagePath ?? null,
        imageMime: q.imageMime ?? null,
        imageSizeBytes: q.imageSizeBytes ?? null,
        updatedAt: String(q.updatedAt),
      }))
    );
  }

  async function create() {
    setError(null);
    setSaving("create");
    try {
      const res = await fetch("/api/admin/staff-application/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order: newDefaults.order,
          active: newDefaults.active,
          promptJson: buildPromptJson(newDefaults.zhHant, newDefaults.zhHans, newDefaults.en),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "create_failed");
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || e || "failed"));
    } finally {
      setSaving(null);
    }
  }

  async function save(q: Q, patch: Partial<Q>) {
    setError(null);
    setSaving(q.id);
    try {
      const next = { ...q, ...patch };
      const res = await fetch(`/api/admin/staff-application/questions/${encodeURIComponent(q.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: next.order, active: next.active, promptJson: next.promptJson }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "save_failed");
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || e || "failed"));
    } finally {
      setSaving(null);
    }
  }

  async function remove(q: Q) {
    if (!window.confirm(locale === "en" ? "Delete this question?" : locale === "zh-Hans" ? "删除此题？" : "刪除此題？")) return;
    setError(null);
    setSaving(q.id);
    try {
      const res = await fetch(`/api/admin/staff-application/questions/${encodeURIComponent(q.id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "delete_failed");
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || e || "failed"));
    } finally {
      setSaving(null);
    }
  }

  async function uploadImage(q: Q, file: File) {
    setError(null);
    setSaving(q.id);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/admin/staff-application/questions/${encodeURIComponent(q.id)}/image`, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "upload_failed");
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || e || "failed"));
    } finally {
      setSaving(null);
    }
  }

  async function removeImage(q: Q) {
    if (!window.confirm(locale === "en" ? "Remove image?" : locale === "zh-Hans" ? "删除图片？" : "刪除圖片？")) return;
    setError(null);
    setSaving(q.id);
    try {
      const res = await fetch(`/api/admin/staff-application/questions/${encodeURIComponent(q.id)}/image`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "delete_failed");
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || e || "failed"));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Questions" : locale === "zh-Hans" ? "题目" : "題目"}
          </div>
          <button
            type="button"
            onClick={create}
            disabled={!!saving}
            className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {locale === "en" ? "Add question" : locale === "zh-Hans" ? "新增题目" : "新增題目"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-100">{error}</div>
        ) : null}
      </div>

      <div className="space-y-3">
        {qs.map((q) => {
          const obj = safeParse<{ zhHant?: string; zhHans?: string; en?: string }>(q.promptJson, {});
          const busy = saving === q.id;
          return (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    #{q.id}{" "}
                    <span className="ml-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {locale === "en" ? "Order" : locale === "zh-Hans" ? "排序" : "排序"}: {q.order} ·{" "}
                      {q.active ? (locale === "en" ? "Active" : locale === "zh-Hans" ? "启用" : "啟用") : locale === "en" ? "Disabled" : locale === "zh-Hans" ? "停用" : "停用"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">{promptFor(locale, q.promptJson) || "—"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => save(q, {})}
                    disabled={busy}
                    className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {locale === "en" ? "Save" : locale === "zh-Hans" ? "保存" : "儲存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(q)}
                    disabled={busy}
                    className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-500/15 dark:text-red-100 disabled:opacity-60"
                  >
                    {locale === "en" ? "Delete" : locale === "zh-Hans" ? "删除" : "刪除"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">繁體</div>
                  <textarea
                    value={obj.zhHant ?? ""}
                    onChange={(e) => {
                      const next = buildPromptJson(e.target.value, obj.zhHans ?? "", obj.en ?? "");
                      setQs((arr) => arr.map((x) => (x.id === q.id ? { ...x, promptJson: next } : x)));
                    }}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">简体</div>
                  <textarea
                    value={obj.zhHans ?? ""}
                    onChange={(e) => {
                      const next = buildPromptJson(obj.zhHant ?? "", e.target.value, obj.en ?? "");
                      setQs((arr) => arr.map((x) => (x.id === q.id ? { ...x, promptJson: next } : x)));
                    }}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">English</div>
                  <textarea
                    value={obj.en ?? ""}
                    onChange={(e) => {
                      const next = buildPromptJson(obj.zhHant ?? "", obj.zhHans ?? "", e.target.value);
                      setQs((arr) => arr.map((x) => (x.id === q.id ? { ...x, promptJson: next } : x)));
                    }}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{locale === "en" ? "Order" : locale === "zh-Hans" ? "排序" : "排序"}</div>
                  <input
                    type="number"
                    value={q.order}
                    onChange={(e) => setQs((arr) => arr.map((x) => (x.id === q.id ? { ...x, order: Number(e.target.value || 0) } : x)))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={q.active}
                      onChange={(e) => setQs((arr) => arr.map((x) => (x.id === q.id ? { ...x, active: e.target.checked } : x)))}
                    />
                    {locale === "en" ? "Active" : locale === "zh-Hans" ? "启用" : "啟用"}
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-sky-50 p-4 text-sm dark:border-white/10 dark:bg-sky-950/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Image" : locale === "zh-Hans" ? "图片" : "圖片"}</div>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-400">
                      {locale === "en" ? "Upload" : locale === "zh-Hans" ? "上传" : "上傳"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          uploadImage(q, f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {q.imagePath ? (
                      <button
                        type="button"
                        onClick={() => removeImage(q)}
                        disabled={busy}
                        className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-500/15 dark:text-red-100 disabled:opacity-60"
                      >
                        {locale === "en" ? "Remove" : locale === "zh-Hans" ? "删除" : "刪除"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {q.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/staff-application/questions/${encodeURIComponent(q.id)}/image`} alt="q" className="mt-3 max-h-64 w-full rounded-xl object-contain" />
                ) : (
                  <div className="mt-2 text-slate-700 dark:text-slate-200">{locale === "en" ? "No image." : locale === "zh-Hans" ? "暂无图片。" : "暫無圖片。"}</div>
                )}
              </div>
            </div>
          );
        })}
        {!qs.length ? (
          <div className="text-sm text-slate-700 dark:text-slate-200">{locale === "en" ? "No questions yet." : locale === "zh-Hans" ? "暂无题目。" : "暫無題目。"}</div>
        ) : null}
      </div>
    </div>
  );
}

