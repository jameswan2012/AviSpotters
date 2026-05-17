"use client";

import { useMemo, useState } from "react";

export function TicketForm({ locale, initialEmail }: { locale: "zh-Hant" | "zh-Hans" | "en"; initialEmail?: string | null }) {
  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);

  const [email, setEmail] = useState((initialEmail ?? "").trim());
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (sending) return;
    setOk(null);
    setError(null);
    try {
      setSending(true);
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), body: body.trim() }),
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }
      if (!res.ok) throw new Error(json.error || tr("送出失敗", "提交失败", "Submit failed"));
      setOk(tr("已送出，我們會儘快處理。", "已提交，我们会尽快处理。", "Submitted. We'll handle it ASAP."));
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("送出失敗", "提交失败", "Submit failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="ui-panel p-6">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("BUG 回報 / 工單", "BUG 回报 / 工单", "Bug report / Ticket")}</div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
        {tr("只需要填寫 Email 與內容即可。管理員以上會回覆並結案。", "只需要填写 Email 与内容即可。管理员以上会回复并结案。", "Email + message only. Admins will reply and close it.")}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("Email", "Email", "Email")}</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tr("你的 Email", "你的 Email", "your@email.com")}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("內容", "内容", "Message")}</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={tr("請描述問題/建議，並附上頁面路徑與重現步驟（如果有）。", "请描述问题/建议，并附上页面路径与复现步骤（如果有）。", "Describe the issue and steps to reproduce (if any).")}
            rows={8}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={sending || !email.trim() || !body.trim()}
          className="ui-btn-primary disabled:opacity-60"
        >
          {sending ? tr("送出中…", "提交中…", "Submitting…") : tr("送出", "提交", "Submit")}
        </button>
        {ok ? <div className="text-sm text-emerald-700 dark:text-emerald-200">{ok}</div> : null}
        {error ? <div className="text-sm text-red-700 dark:text-red-200">{error}</div> : null}
      </div>
    </div>
  );
}

