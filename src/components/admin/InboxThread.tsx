"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type Message = { id: string; body: string; createdAt: string; mine: boolean };
type ThreadResponse = {
  conversationId: string;
  userLabel: string;
  status: "open" | "closed" | string;
  assignedStaffId: string | null;
  messages: Message[];
  canReply: boolean;
  canClose?: boolean;
};

export function InboxThread({ conversationId }: { conversationId: string }) {
  const locale = useClientLocale();
  const [data, setData] = useState<ThreadResponse | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => !!data?.canReply && body.trim().length > 0 && !loading,
    [data?.canReply, body, loading]
  );

  async function refresh() {
    const res = await fetch(`/api/admin/inbox/${encodeURIComponent(conversationId)}`);
    const json = (await res.json()) as ThreadResponse;
    setData(json);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/inbox/${encodeURIComponent(conversationId)}/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      setBody("");
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function closeThread() {
    if (!data?.canClose || loading) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/inbox/${encodeURIComponent(conversationId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
        {locale === "en" ? "Loading…" : locale === "zh-Hans" ? "加载中…" : "載入中…"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">
          {locale === "en" ? "Thread" : locale === "zh-Hans" ? "对话" : "對話"}
        </div>
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en" ? "From" : locale === "zh-Hans" ? "来自" : "來自"}：{data.userLabel}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
              data.status === "closed"
                ? "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                : "border-emerald-400/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
            ].join(" ")}
          >
            {data.status === "closed" ? (locale === "en" ? "Closed" : locale === "zh-Hans" ? "已结案" : "已結案") : locale === "en" ? "Open" : locale === "zh-Hans" ? "未结案" : "未結案"}
          </span>
          {data.canClose ? (
            <button
              type="button"
              onClick={closeThread}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              {loading ? (locale === "en" ? "Closing…" : locale === "zh-Hans" ? "结案中…" : "結案中…") : locale === "en" ? "Close" : locale === "zh-Hans" ? "结案" : "結案"}
            </button>
          ) : null}
        </div>
        {!data.canReply ? (
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "You don't have permission to reply (Admin required)."
              : locale === "zh-Hans"
                ? "你目前没有回复权限（需管理员）。"
                : "你目前沒有回覆權限（需管理員）。"}
          </div>
        ) : null}
        {data.status !== "open" ? (
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "This thread is closed."
              : locale === "zh-Hans"
                ? "该对话已结案，无法继续回复。"
                : "此對話已結案，無法繼續回覆。"}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <div className="max-h-[55vh] space-y-2 overflow-auto p-2">
          {data.messages.map((m) => (
            <div key={m.id} className={["flex", m.mine ? "justify-end" : "justify-start"].join(" ")}>
              <div
                className={[
                  "max-w-[85%] rounded-2xl border px-3 py-2 text-sm leading-6",
                  m.mine
                    ? "border-red-400/20 bg-red-500/10 text-slate-900 dark:text-slate-100"
                    : "border-slate-200 bg-sky-50 text-slate-900 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-100",
                ].join(" ")}
              >
                {m.body}
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={locale === "en" ? "Type a reply…" : locale === "zh-Hans" ? "输入回复…" : "輸入回覆…"}
            disabled={!data.canReply || data.status !== "open"}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 disabled:opacity-60 dark:border-white/10 dark:bg-sky-950/50 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-sky-400/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className="rounded-xl bg-red-400 px-4 py-2.5 text-sm font-semibold text-sky-950 hover:bg-red-300 disabled:opacity-60"
          >
            {loading ? (locale === "en" ? "Sending…" : locale === "zh-Hans" ? "发送中…" : "送出中…") : locale === "en" ? "Reply" : locale === "zh-Hans" ? "回复" : "回覆"}
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">
          {locale === "en" ? "Shortcut: Ctrl/⌘ + Enter to send" : locale === "zh-Hans" ? "快捷键：Ctrl/⌘ + Enter 发送" : "快捷鍵：Ctrl/⌘ + Enter 送出"}
        </div>
      </div>
    </div>
  );
}

