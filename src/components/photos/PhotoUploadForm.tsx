"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function PhotoUploadForm({
  occupied,
  queueLimit,
  priorityPasses = 0,
}: {
  occupied: number;
  queueLimit: number;
  priorityPasses?: number;
}) {
  const router = useRouter();
  const safeQueueLimit = Math.max(1, Math.round(Number(queueLimit) || 5));
  const remaining = Math.max(0, safeQueueLimit - occupied);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [usePriority, setUsePriority] = useState(false);

  const queueText = useMemo(() => `${occupied} / ${safeQueueLimit}`, [occupied, safeQueueLimit]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setOk(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      if (usePriority) formData.set("usePriority", "1");
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(json.error || "上傳失敗");
      form.reset();
      setUsePriority(false);
      setOk("作品已進入待審佇列。");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700 dark:border-sky-400/20 dark:bg-sky-950/30 dark:text-slate-200">
        <div className="font-semibold text-slate-900 dark:text-white">待審佇列</div>
        <div className="mt-1">
          目前佔用：<span className="font-bold">{queueText}</span>
          {remaining > 0 ? `，尚可再提交 ${remaining} 張。` : "，目前已滿，請等待審核完成後再提交。"}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-100">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-100">{ok}</div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">提交照片</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">帶 `*` 為必填，提交後會進入待審佇列。</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="註冊號 *">
            <input name="registration" required maxLength={32} className={inputClass} placeholder="例如 B-1234" />
          </Field>
          <Field label="拍攝機場 *">
            <input name="shotAirport" required maxLength={64} className={inputClass} placeholder="例如 HKG / 香港" />
          </Field>
          <Field label="機型 *">
            <input name="aircraftModel" required maxLength={128} className={inputClass} placeholder="例如 Boeing 777-300ER" />
          </Field>
          <Field label="航空公司 *">
            <input name="airline" required maxLength={128} className={inputClass} placeholder="例如 Cathay Pacific" />
          </Field>
          <Field label="拍攝日期 *">
            <input name="shotAt" type="date" required className={inputClass} />
          </Field>
          <Field label="標題">
            <input name="title" maxLength={160} className={inputClass} placeholder="可留空" />
          </Field>
          <Field label="MSN">
            <input name="msn" maxLength={64} className={inputClass} placeholder="可留空" />
          </Field>
          <Field label="序列號">
            <input name="serialNumber" maxLength={64} className={inputClass} placeholder="可留空" />
          </Field>
          <Field label="回覆語言">
            <select name="replyLocale" defaultValue="zh-Hant" className={inputClass}>
              <option value="zh-Hant">繁體中文</option>
              <option value="zh-Hans">简体中文</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="分類">
            <input name="categories" maxLength={300} className={inputClass} placeholder="用逗號分隔，例如 客機, 夜景" />
          </Field>
        </div>

        <Field label="描述">
          <textarea name="description" rows={4} maxLength={2000} className={textareaClass} placeholder="可留空" />
        </Field>

        <Field label="給審核員的留言">
          <textarea name="uploaderMessage" rows={3} maxLength={1000} className={textareaClass} placeholder="僅審核員可見，可留空" />
        </Field>

        <Field label="圖片檔案 *">
          <input name="image" type="file" accept="image/jpeg,image/png" required className={inputClass} disabled={remaining <= 0 || submitting} />
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">目前支援 JPG / PNG，系統會自動產生展示圖與縮圖。</div>
        </Field>

        {priorityPasses > 0 ? (
          <label className="flex items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            <input type="checkbox" checked={usePriority} onChange={(e) => setUsePriority(e.target.checked)} disabled={submitting} />
            <span>使用優先佇列（目前可用 {priorityPasses} 次）</span>
          </label>
        ) : null}

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <input name="ccAgree" type="checkbox" value="1" required disabled={submitting || remaining <= 0} className="mt-0.5" />
          <span>我確認我擁有此圖片的合法權利，並同意依站點規則進行展示與審核。</span>
        </label>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={submitting || remaining <= 0}
            className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "提交中…" : remaining <= 0 ? "佇列已滿" : "提交照片"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</div>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white";
