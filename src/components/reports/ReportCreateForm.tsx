"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

export function ReportCreateForm({ targetType, targetId }: { targetType: "photo" | "airport"; targetId: string }) {
  const router = useRouter();
  const locale = useClientLocale();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = message.trim().length >= 6 && message.trim().length <= 2000;

  async function submit() {
    setError(null);
    if (!canSubmit || loading) return;
    try {
      setLoading(true);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, message }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || (locale === "en" ? "Failed to submit report" : locale === "zh-Hans" ? "提交举报失败" : "提交舉報失敗"));
      router.replace("/reports");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : locale === "en" ? "Failed to submit report" : locale === "zh-Hans" ? "提交举报失败" : "提交舉報失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ui-panel p-6">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Report details" : locale === "zh-Hans" ? "举报内容" : "舉報內容"}</div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
        {locale === "en"
          ? "Describe what information is wrong and what it should be."
          : locale === "zh-Hans"
            ? "请说明哪里信息错误、应该修改成什么。"
            : "請說明哪裡資訊錯誤、應該修改成什麼。"}
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

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || loading}
        className="ui-btn-primary mt-4 disabled:opacity-60"
      >
        {loading ? (locale === "en" ? "Submitting…" : locale === "zh-Hans" ? "提交中…" : "提交中…") : locale === "en" ? "Submit report" : locale === "zh-Hans" ? "提交举报" : "提交舉報"}
      </button>
    </div>
  );
}

