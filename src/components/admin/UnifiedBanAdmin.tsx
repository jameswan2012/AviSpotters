"use client";

import { useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

export function UnifiedBanAdmin() {
  const locale = useClientLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [scope, setScope] = useState<"local" | "global">("local");
  const [targetType, setTargetType] = useState<"email" | "phone" | "username" | "ip">("email");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<"permanent" | "until">("permanent");
  const [until, setUntil] = useState("");

  async function submit() {
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bans/identity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope,
          targetType,
          value: value.trim(),
          reason: reason.trim() || null,
          bannedUntil: duration === "until" ? until || null : null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; localCreated?: boolean; externalCreated?: boolean };
      if (!res.ok) {
        throw new Error(
          json.error ||
            (locale === "en" ? "Create failed" : locale === "zh-Hans" ? "创建失败" : "建立失敗")
        );
      }
      setOk(
        locale === "en"
          ? `Done. local=${json.localCreated ? "yes" : "no"}, external=${json.externalCreated ? "yes" : "no"}`
          : locale === "zh-Hans"
            ? `已执行。站内=${json.localCreated ? "是" : "否"}，联合=${json.externalCreated ? "是" : "否"}`
            : `已執行。站內=${json.localCreated ? "是" : "否"}，聯合=${json.externalCreated ? "是" : "否"}`
      );
      setValue("");
      setReason("");
      setDuration("permanent");
      setUntil("");
    } catch (e) {
      setError(e instanceof Error ? e.message : locale === "en" ? "Create failed" : locale === "zh-Hans" ? "创建失败" : "建立失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">
        {locale === "en" ? "Quick identity ban (unregistered supported)" : locale === "zh-Hans" ? "快速封禁（支持未注册对象）" : "快速封禁（支援未註冊對象）"}
      </div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
        {locale === "en"
          ? "Use this panel to ban by email / phone / username / IP. Local mode for this site only; Global mode syncs to federation API."
          : locale === "zh-Hans"
            ? "可按邮箱/手机号/用户名/IP 封禁。站内模式仅本网站生效；联合模式会同步到联合封禁 API。"
            : "可依 Email/手機號/使用者名稱/IP 封禁。站內模式僅本站生效；聯合模式會同步到聯合封禁 API。"}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {locale === "en" ? "Scope" : locale === "zh-Hans" ? "范围" : "範圍"}
          </div>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value === "global" ? "global" : "local")}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          >
            <option value="local">{locale === "en" ? "Local site only" : locale === "zh-Hans" ? "仅站内" : "僅站內"}</option>
            <option value="global">{locale === "en" ? "Global (federated)" : locale === "zh-Hans" ? "全站联合" : "全站聯合"}</option>
          </select>
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {locale === "en" ? "Identifier type" : locale === "zh-Hans" ? "标识类型" : "標識類型"}
          </div>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as any)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          >
            <option value="email">Email</option>
            <option value="phone">{locale === "en" ? "Phone" : locale === "zh-Hans" ? "手机号" : "手機號"}</option>
            <option value="username">{locale === "en" ? "Username" : locale === "zh-Hans" ? "用户名" : "使用者名稱"}</option>
            <option value="ip">IP</option>
          </select>
        </label>
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {locale === "en" ? "Value" : locale === "zh-Hans" ? "值" : "值"}
          </div>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            placeholder={targetType === "ip" ? "1.2.3.4 or 1.2.3.*" : targetType === "email" ? "user@example.com" : targetType === "phone" ? "+8613800138000" : "username"}
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {locale === "en" ? "Duration" : locale === "zh-Hans" ? "时效" : "時效"}
          </div>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value === "until" ? "until" : "permanent")}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          >
            <option value="permanent">{locale === "en" ? "Permanent" : locale === "zh-Hans" ? "永久" : "永久"}</option>
            <option value="until">{locale === "en" ? "Expire at date" : locale === "zh-Hans" ? "到指定日期" : "到指定日期"}</option>
          </select>
        </label>

        <label className="block md:col-span-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {locale === "en" ? "Reason (optional)" : locale === "zh-Hans" ? "原因（可选）" : "原因（選填）"}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          />
        </label>
        {duration === "until" ? (
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {locale === "en" ? "Expire at" : locale === "zh-Hans" ? "到期时间" : "到期時間"}
            </div>
            <input
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            />
          </label>
        ) : null}
      </div>

      {error ? <div className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
      {ok ? <div className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{ok}</div> : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={loading || !value.trim() || (duration === "until" && !until)}
          onClick={() => void submit()}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {locale === "en" ? "Create ban" : locale === "zh-Hans" ? "执行封禁" : "執行封禁"}
        </button>
      </div>
    </div>
  );
}

