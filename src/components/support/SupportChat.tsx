"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";
import { t } from "@/i18n/t";

type Conversation = { id: string; status: string; assignedStaffId: string | null; updatedAt: string };
type Message = { id: string; body: string; createdAt: string; mine: boolean };

export function SupportChat() {
  const locale = useClientLocale();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => body.trim().length > 0 && !loading, [body, loading]);

  async function refresh() {
    setError(null);
    const res = await fetch("/api/support/thread", { method: "GET" });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      const msg = typeof data?.error === "string" ? data.error : locale === "en" ? "Load failed" : locale === "zh-Hans" ? "加载失败" : "載入失敗";
      setError(msg);
      return;
    }
    setConversation(data.conversation);
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as any;
        const msg = typeof j?.error === "string" ? j.error : locale === "en" ? "Send failed" : locale === "zh-Hans" ? "发送失败" : "送出失敗";
        throw new Error(msg);
      }
      setBody("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : locale === "en" ? "Send failed" : locale === "zh-Hans" ? "发送失败" : "送出失敗");
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = useMemo(() => {
    if (!conversation) return null;
    const s = String(conversation.status || "");
    if (s === "open") return locale === "en" ? "Open" : locale === "zh-Hans" ? "未结案" : "未結案";
    if (s === "closed") return locale === "en" ? "Closed" : locale === "zh-Hans" ? "已结案" : "已結案";
    return s;
  }, [conversation, locale]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="ui-panel-strong p-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(locale, "support.title")}</div>
        <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{t(locale, "support.subtitle")}</div>
        {error ? <div className="mt-3 text-sm text-red-700 dark:text-red-200">{error}</div> : null}
        {conversation ? (
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            {t(locale, "support.status")}：
            <span className="ml-1 font-semibold text-slate-900 dark:text-slate-100">{statusLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="ui-panel p-4">
        <div className="max-h-[55vh] space-y-2 overflow-auto p-2">
          {messages.length ? (
            messages.map((m) => (
              <div key={m.id} className={["flex", m.mine ? "justify-end" : "justify-start"].join(" ")}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl border px-3 py-2 text-sm leading-6",
                    m.mine
                      ? "border-sky-400/20 bg-sky-500/10 text-slate-900 dark:text-slate-100"
                      : "border-slate-200 bg-sky-50 text-slate-900 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-100",
                  ].join(" ")}
                >
                  {m.body}
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-slate-700 dark:text-slate-200">{t(locale, "support.empty")}</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t(locale, "support.input.placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/50 dark:text-white dark:placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className="ui-btn-primary disabled:opacity-60"
          >
            {loading ? t(locale, "support.sending") : t(locale, "support.send")}
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">{t(locale, "support.shortcut")}</div>
      </div>
    </div>
  );
}

