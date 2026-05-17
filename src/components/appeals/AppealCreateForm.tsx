"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

function shouldWarnAppeal(text: string) {
  const s = (text || "").toLowerCase();
  // Trigger on explicit platform mentions; avoid matching common single-character words.
  return /\bxz\b/.test(s) || s.includes("xzphotos") || s.includes("x z") || s.includes("xz photos");
}

export function AppealCreateForm({ photoId }: { photoId: string }) {
  const router = useRouter();
  const locale = useClientLocale();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [force, setForce] = useState(false);

  const canSubmit = message.trim().length >= 6 && message.trim().length <= 2000;

  async function submit() {
    setError(null);
    if (!canSubmit || loading) return;
    if (!force && shouldWarnAppeal(message)) {
      setWarnOpen(true);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/appeals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId, message }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || (locale === "en" ? "Failed to submit appeal" : locale === "zh-Hans" ? "提交申诉失败" : "提交申訴失敗"));
      setDone(true);
      router.replace("/appeals");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : locale === "en" ? "Failed to submit appeal" : locale === "zh-Hans" ? "提交申诉失败" : "提交申訴失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ui-panel p-6">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Appeal message" : locale === "zh-Hans" ? "申诉内容" : "申訴內容"}</div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
        {locale === "en"
          ? "Explain why you think this rejection should be reviewed again."
          : locale === "zh-Hans"
            ? "说明你为什么认为这次拒绝需要重新审查。"
            : "說明你為什麼認為這次拒絕需要重新審查。"}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        placeholder={locale === "en" ? "Write here…" : locale === "zh-Hans" ? "写在这里…" : "寫在這裡…"}
        className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:border-white/10 dark:bg-black/10 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">{message.trim().length}/2000</div>

      {error ? <div className="mt-3 text-sm text-red-700 dark:text-red-200">{error}</div> : null}
      {done ? <div className="mt-3 text-sm text-emerald-700 dark:text-emerald-200">{locale === "en" ? "Submitted." : locale === "zh-Hans" ? "已提交。" : "已提交。"}</div> : null}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || loading}
        className="ui-btn-primary mt-4 disabled:opacity-60"
      >
        {loading ? (locale === "en" ? "Submitting…" : locale === "zh-Hans" ? "提交中…" : "提交中…") : locale === "en" ? "Submit appeal" : locale === "zh-Hans" ? "提交申诉" : "提交申訴"}
      </button>

      {warnOpen ? (
        <div className="fixed inset-0 z-[95] bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-12 w-full max-w-xl rounded-2xl border border-red-500/30 bg-white p-5 shadow-2xl dark:bg-sky-950">
            <div className="text-sm font-extrabold text-red-700 dark:text-red-200">
              {locale === "en" ? "Warning" : locale === "zh-Hans" ? "警告" : "警告"}
            </div>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
              {locale === "en"
                ? "We do not accept arguments like “it passed on xzphotos/other platforms”, and we do not recognize those standards.\nIf you insist on submitting this appeal, your account may be banned."
                : locale === "zh-Hans"
                  ? "我们不接受您在 xzphotos 或其他平台已过的说法，并且我们不认可该平台的标准。\n如果您执意申诉，账号可能会被封禁。"
                  : "我們不接受您在 xzphotos 或其他平台已過的說法，並且我們不認可該平台的標準。\n如果您執意申訴，帳號可能會被封禁。"}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setWarnOpen(false);
                  setForce(true);
                  void submit();
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                {locale === "en" ? "Submit anyway" : locale === "zh-Hans" ? "执意提交" : "執意提交"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWarnOpen(false);
                }}
                className="ui-btn-muted"
              >
                {locale === "en" ? "Cancel" : locale === "zh-Hans" ? "不提交" : "不提交"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

