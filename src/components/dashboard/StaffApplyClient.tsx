"use client";

import { useMemo, useState, type FormEvent } from "react";

type Q = { id: string; order: number; promptJson: string; imagePath: string | null; imageMime: string | null; imageSizeBytes: number | null };
type AppRow = {
  id: string;
  status: string;
  tracksJson: string | null;
  imagesJson: string | null;
  answersJson: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function safeParseJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function promptForLocale(locale: "zh-Hant" | "zh-Hans" | "en", promptJson: string) {
  const obj = safeParseJson<{ zhHant?: string; zhHans?: string; en?: string }>(promptJson, {});
  if (locale === "en") return (obj.en ?? obj.zhHant ?? obj.zhHans ?? "").trim();
  if (locale === "zh-Hans") return (obj.zhHans ?? obj.zhHant ?? obj.en ?? "").trim();
  return (obj.zhHant ?? obj.zhHans ?? obj.en ?? "").trim();
}

const TRACKS = [
  { id: "TOGA", label: { "zh-Hant": "TO/GA（過圖數 > 100）", "zh-Hans": "TO/GA（过图数 > 100）", en: "TO/GA (>100 accepted)" } },
  { id: "Planespotter", label: { "zh-Hant": "Planespotter（過圖數 > 70）", "zh-Hans": "Planespotter（过图数 > 70）", en: "Planespotter (>70 accepted)" } },
  { id: "APJP", label: { "zh-Hant": "AP/JP（過圖數 > 50）", "zh-Hans": "AP/JP（过图数 > 50）", en: "AP/JP (>50 accepted)" } },
] as const;

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

export function StaffApplyClient({
  locale,
  approvedCount,
  initialApplication,
  questions,
}: {
  locale: "zh-Hant" | "zh-Hans" | "en";
  approvedCount: number;
  initialApplication: any | null;
  questions: Q[];
}) {
  const eligible = approvedCount > 100;
  const initialApp = useMemo<AppRow | null>(() => {
    if (!initialApplication) return null;
    return {
      id: String(initialApplication.id),
      status: String(initialApplication.status),
      tracksJson: initialApplication.tracksJson ?? null,
      imagesJson: initialApplication.imagesJson ?? null,
      answersJson: initialApplication.answersJson ?? null,
      submittedAt: initialApplication.submittedAt ? String(initialApplication.submittedAt) : null,
      createdAt: String(initialApplication.createdAt),
      updatedAt: String(initialApplication.updatedAt),
    };
  }, [initialApplication]);

  const [app, setApp] = useState<AppRow | null>(initialApp);
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(() => {
    if (!initialApp) return 0;
    if (initialApp.status === "submitted" || initialApp.status === "reviewing" || initialApp.status === "accepted" || initialApp.status === "rejected") return 4;
    const imgs = safeParseJson<any[]>(initialApp.imagesJson, []);
    const ans = safeParseJson<any[]>(initialApp.answersJson, []);
    if (ans.length) return 3;
    if (imgs.length) return 2;
    return 1;
  });
  const [tracks, setTracks] = useState<string[]>(() => safeParseJson<string[]>(initialApp?.tracksJson ?? null, []));
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const arr = safeParseJson<{ questionId: string; answer: string }[]>(initialApp?.answersJson ?? null, []);
    const m: Record<string, string> = {};
    for (const it of arr) if (it && it.questionId) m[String(it.questionId)] = String(it.answer ?? "");
    return m;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const images = useMemo(() => safeParseJson<{ path: string; mime: string; sizeBytes: number; name?: string }[]>(app?.imagesJson ?? null, []), [app?.imagesJson]);

  const statusText = useMemo(() => {
    const s = String(app?.status ?? "");
    if (!s) return "";
    if (locale === "en") return s;
    if (locale === "zh-Hans") return s === "draft" ? "草稿" : s === "submitted" ? "已提交" : s === "reviewing" ? "审核中" : s === "accepted" ? "已通过" : s === "rejected" ? "未通过" : s;
    return s === "draft" ? "草稿" : s === "submitted" ? "已提交" : s === "reviewing" ? "審核中" : s === "accepted" ? "已通過" : s === "rejected" ? "未通過" : s;
  }, [app?.status, locale]);

  async function saveDraft(nextTracks: string[]) {
    const res = await fetch("/api/dashboard/staff-application", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tracks: nextTracks }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; application?: AppRow };
    if (!res.ok) throw new Error(data.error || "save_failed");
    if (data.application) setApp(data.application);
    return data.application ?? null;
  }

  async function uploadOne(applicationId: string, file: File) {
    const form = new FormData();
    form.set("applicationId", applicationId);
    form.set("file", file);
    const res = await fetch("/api/dashboard/staff-application/upload", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; application?: AppRow };
    if (!res.ok) throw new Error(data.error || "upload_failed");
    if (data.application) setApp(data.application);
  }

  async function submitFinal(applicationId: string) {
    const payload = {
      applicationId,
      answers: questions.map((q) => ({ questionId: q.id, answer: (answers[q.id] ?? "").trim() })),
    };
    const res = await fetch("/api/dashboard/staff-application/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; application?: AppRow };
    if (!res.ok) throw new Error(data.error || "submit_failed");
    if (data.application) setApp(data.application);
    setStep(4);
  }

  async function onStart(e: FormEvent) {
    e.preventDefault();
    if (!eligible) return;
    setError(null);
    setLoading(true);
    try {
      if (!tracks.length) {
        throw new Error(locale === "en" ? "Pick at least one option." : locale === "zh-Hans" ? "请至少选择一个选项。" : "請至少選擇一個選項。");
      }
      await saveDraft(tracks);
      setStep(2);
    } catch (err: any) {
      setError(String(err?.message || err || "failed"));
    } finally {
      setLoading(false);
    }
  }

  async function onUploadNext() {
    if (!app?.id) return;
    setError(null);
    setLoading(true);
    try {
      const existing = images.length;
      const remain = Math.max(0, MAX_FILES - existing);
      const take = localFiles.slice(0, remain);
      if (!take.length) {
        throw new Error(locale === "en" ? "Please choose image files to upload." : locale === "zh-Hans" ? "请选择要上传的图片。" : "請選擇要上傳的圖片。");
      }
      for (const f of take) {
        await uploadOne(app.id, f);
      }
      setLocalFiles([]);
      setStep(3);
    } catch (err: any) {
      setError(String(err?.message || err || "failed"));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitFinal() {
    if (!app?.id) return;
    setError(null);
    setLoading(true);
    try {
      if (!images.length) {
        throw new Error(locale === "en" ? "Please upload at least one image." : locale === "zh-Hans" ? "请至少上传一张图片。" : "請至少上傳一張圖片。");
      }
      await submitFinal(app.id);
    } catch (err: any) {
      setError(String(err?.message || err || "failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {locale === "en" ? "Eligibility" : locale === "zh-Hans" ? "资格验证" : "資格驗證"}
            </div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {locale === "en"
                ? `Approved photos: ${approvedCount}`
                : locale === "zh-Hans"
                  ? `已通过图片数：${approvedCount}`
                  : `已通過圖片數：${approvedCount}`}
            </div>
          </div>
          <span
            className={[
              "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold",
              eligible
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                : "border-amber-400/20 bg-amber-500/10 text-amber-800 dark:text-amber-200",
            ].join(" ")}
          >
            {eligible
              ? locale === "en"
                ? "Eligible"
                : locale === "zh-Hans"
                  ? "符合"
                  : "符合"
              : locale === "en"
                ? "Not eligible"
                : locale === "zh-Hans"
                  ? "不符合"
                  : "不符合"}
          </span>
        </div>
        {!eligible ? (
          <div className="mt-4 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "You need more than 100 approved photos to apply."
              : locale === "zh-Hans"
                ? "你需要已通过图片数大于 100 才能申请。"
                : "你需要已通過圖片數大於 100 才能申請。"}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Application" : locale === "zh-Hans" ? "申请" : "申請"}
          </div>
          {app ? (
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {locale === "en" ? "Status" : locale === "zh-Hans" ? "状态" : "狀態"}：{statusText}
            </span>
          ) : null}
        </div>

        {step === 0 || step === 1 ? (
          <form onSubmit={onStart} className="mt-4 space-y-4">
            <div className="text-sm text-slate-700 dark:text-slate-200">
              {locale === "en"
                ? "Choose one or more tracks (self-reported):"
                : locale === "zh-Hans"
                  ? "请选择轨道（可多选，自述）："
                  : "請選擇軌道（可多選，自述）："}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {TRACKS.map((tr) => {
                const checked = tracks.includes(tr.id);
                return (
                  <label
                    key={tr.id}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-sky-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-sky-950/30"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked ? Array.from(new Set([...tracks, tr.id])) : tracks.filter((x) => x !== tr.id);
                        setTracks(next);
                      }}
                    />
                    <span className="font-semibold text-slate-900 dark:text-white">{tr.label[locale]}</span>
                  </label>
                );
              })}
            </div>
            <button
              type="submit"
              disabled={loading || !eligible}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? (locale === "en" ? "Saving..." : locale === "zh-Hans" ? "保存中..." : "儲存中...") : locale === "en" ? "Next: upload images" : locale === "zh-Hans" ? "下一步：上传图片" : "下一步：上傳圖片"}
            </button>
          </form>
        ) : null}

        {step === 2 ? (
          <div className="mt-4 space-y-4">
            <div className="text-sm text-slate-700 dark:text-slate-200">
              {locale === "en"
                ? `Upload up to ${MAX_FILES} images (JPG/PNG, each <= 5MB).`
                : locale === "zh-Hans"
                  ? `最多上传 ${MAX_FILES} 张图片（JPG/PNG，每张 ≤ 5MB）。`
                  : `最多上傳 ${MAX_FILES} 張圖片（JPG/PNG，每張 ≤ 5MB）。`}
            </div>

            <div className="rounded-xl border border-slate-200 bg-sky-50 p-4 text-sm dark:border-white/10 dark:bg-sky-950/30">
              <div className="font-semibold text-slate-900 dark:text-white">
                {locale === "en" ? "Uploaded" : locale === "zh-Hans" ? "已上传" : "已上傳"}：{images.length}/{MAX_FILES}
              </div>
              {images.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">
                  {images.map((im, idx) => (
                    <li key={im.path + idx}>{im.name || im.path.split("/").slice(-1)[0]}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-slate-700 dark:text-slate-200">
                  {locale === "en" ? "No images yet." : locale === "zh-Hans" ? "暂无图片。" : "暫無圖片。"}
                </div>
              )}
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              multiple
              onChange={(e) => {
                const arr = Array.from(e.target.files || []);
                const filtered = arr.filter((f) => (f.type === "image/jpeg" || f.type === "image/png") && f.size <= MAX_BYTES);
                setLocalFiles(filtered.slice(0, MAX_FILES));
              }}
              className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sky-950 hover:file:bg-sky-400 dark:text-slate-200"
            />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {locale === "en"
                ? "Files larger than 5MB or not JPG/PNG will be ignored."
                : locale === "zh-Hans"
                  ? "大于 5MB 或非 JPG/PNG 的文件会被忽略。"
                  : "大於 5MB 或非 JPG/PNG 的檔案會被忽略。"}
            </div>

            <button
              type="button"
              onClick={onUploadNext}
              disabled={loading || !app?.id}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? (locale === "en" ? "Uploading..." : locale === "zh-Hans" ? "上传中..." : "上傳中...") : locale === "en" ? "Upload and next" : locale === "zh-Hans" ? "上传并下一步" : "上傳並下一步"}
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-4 space-y-4">
            <div className="text-sm text-slate-700 dark:text-slate-200">
              {locale === "en" ? "Questions" : locale === "zh-Hans" ? "题目" : "題目"}
            </div>
            {!questions.length ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                {locale === "en"
                  ? "No questions configured yet. Please contact a Super Admin."
                  : locale === "zh-Hans"
                    ? "题库尚未配置，请联系高级管理员。"
                    : "題庫尚未配置，請聯繫高級管理員。"}
              </div>
            ) : null}
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const prompt = promptForLocale(locale, q.promptJson) || (locale === "en" ? `Question ${idx + 1}` : locale === "zh-Hans" ? `题目 ${idx + 1}` : `題目 ${idx + 1}`);
                return (
                  <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {idx + 1}. {prompt}
                    </div>
                    {q.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/staff-application/questions/${encodeURIComponent(q.id)}/image`}
                        alt="question"
                        className="mt-3 max-h-64 w-full rounded-xl object-contain"
                      />
                    ) : null}
                    <textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers((m) => ({ ...m, [q.id]: e.target.value }))}
                      rows={4}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white dark:placeholder:text-slate-400"
                      placeholder={locale === "en" ? "Your answer..." : locale === "zh-Hans" ? "请输入回答..." : "請輸入回答..."}
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onSubmitFinal}
              disabled={loading || !app?.id}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? (locale === "en" ? "Submitting..." : locale === "zh-Hans" ? "提交中..." : "提交中...") : locale === "en" ? "Submit application" : locale === "zh-Hans" ? "提交申请" : "提交申請"}
            </button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-sky-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-200">
            <div className="font-semibold text-slate-900 dark:text-white">
              {locale === "en" ? "Saved" : locale === "zh-Hans" ? "已保存" : "已保存"}：{statusText || (locale === "en" ? "done" : locale === "zh-Hans" ? "完成" : "完成")}
            </div>
            <div className="mt-2">
              {locale === "en"
                ? "Your application has been submitted. Please wait for review."
                : locale === "zh-Hans"
                  ? "你的申请已提交，请等待审核。"
                  : "你的申請已提交，請等待審核。"}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-100">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

