"use client";

import { useCallback, useEffect, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type Row = {
  id: string;
  ip: string;
  reason: string | null;
  scope?: "local" | "global";
  bannedUntil: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string };
};

export function IpBanAdmin() {
  const locale = useClientLocale();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ip, setIp] = useState("");
  const [scope, setScope] = useState<"local" | "global">("local");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<"permanent" | "until">("permanent");
  const [until, setUntil] = useState("");

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bans/ip");
      const json = (await res.json()) as { bans?: Row[]; error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Load failed" : locale === "zh-Hans" ? "读取失败" : "讀取失敗")
        );
      setRows(Array.isArray(json.bans) ? json.bans : []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : locale === "en" ? "Load failed" : locale === "zh-Hans" ? "读取失败" : "讀取失敗"
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bans/ip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ip: ip.trim(),
          scope,
          reason: reason.trim() || null,
          bannedUntil: duration === "until" ? until.trim() || null : null,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Create failed" : locale === "zh-Hans" ? "新增失败" : "新增失敗")
        );
      setIp("");
      setScope("local");
      setReason("");
      setDuration("permanent");
      setUntil("");
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : locale === "en" ? "Create failed" : locale === "zh-Hans" ? "新增失败" : "新增失敗"
      );
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bans/ip?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Revoke failed" : locale === "zh-Hans" ? "解除失败" : "解除失敗")
        );
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : locale === "en" ? "Revoke failed" : locale === "zh-Hans" ? "解除失败" : "解除失敗"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">
          {locale === "en" ? "IP ban" : locale === "zh-Hans" ? "封禁 IP" : "封禁 IP"}
        </div>
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en" ? (
            <>
              Enter a single IP (e.g. <span className="font-semibold">1.2.3.4</span>) or a prefix rule (e.g.{" "}
              <span className="font-semibold">1.2.3.*</span>). IP bans only apply on non-local deployments.
            </>
          ) : locale === "zh-Hans" ? (
            <>
              输入单一 IP（例如 <span className="font-semibold">1.2.3.4</span>），或前缀规则（例如{" "}
              <span className="font-semibold">1.2.3.*</span>）。IP 封禁仅在非 localhost/本机部署时生效。
            </>
          ) : (
            <>
              輸入單一 IP（例如 <span className="font-semibold">1.2.3.4</span>），或前綴規則（例如{" "}
              <span className="font-semibold">1.2.3.*</span>）。IP 封禁僅在非 localhost/本機部署時生效。
            </>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
              {locale === "en" ? "IP / prefix" : locale === "zh-Hans" ? "IP / 前缀" : "IP / 前綴"}
            </div>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              placeholder={locale === "en" ? "1.2.3.4 or 1.2.3.*" : locale === "zh-Hans" ? "1.2.3.4 或 1.2.3.*" : "1.2.3.4 或 1.2.3.*"}
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
              {locale === "en" ? "Scope" : locale === "zh-Hans" ? "封禁范围" : "封禁範圍"}
            </div>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value === "global" ? "global" : "local")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            >
              <option value="local">{locale === "en" ? "Local site only" : locale === "zh-Hans" ? "仅站内" : "僅站內"}</option>
              <option value="global">{locale === "en" ? "Global label" : locale === "zh-Hans" ? "联合标签" : "聯合標籤"}</option>
            </select>
          </label>
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
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
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
              {locale === "en" ? "Reason (optional)" : locale === "zh-Hans" ? "原因（可选）" : "原因（選填）"}
            </div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              placeholder={locale === "en" ? "e.g. abuse / malicious traffic" : locale === "zh-Hans" ? "例如：攻击/恶意流量" : "例如：攻擊/惡意流量"}
            />
          </label>
          {duration === "until" ? (
            <label className="block md:col-span-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
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

        {error ? <div className="mt-3 text-sm text-red-700 dark:text-red-200">{error}</div> : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={add}
            disabled={loading || !ip.trim()}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {locale === "en" ? "Create ban" : locale === "zh-Hans" ? "新增封禁" : "新增封禁"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">{locale === "en" ? "Scope" : locale === "zh-Hans" ? "范围" : "範圍"}</th>
                <th className="px-4 py-3">{locale === "en" ? "Reason" : locale === "zh-Hans" ? "原因" : "原因"}</th>
                <th className="px-4 py-3">{locale === "en" ? "Expire" : locale === "zh-Hans" ? "到期" : "到期"}</th>
                <th className="px-4 py-3">{locale === "en" ? "Created" : locale === "zh-Hans" ? "建立" : "建立"}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const by = r.createdBy.name ?? r.createdBy.email;
                return (
                  <tr key={r.id} className="border-t border-slate-200 dark:border-white/10">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{r.ip}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {r.scope === "global"
                        ? locale === "en"
                          ? "Global"
                          : locale === "zh-Hans"
                            ? "联合"
                            : "聯合"
                        : locale === "en"
                          ? "Local"
                          : locale === "zh-Hans"
                            ? "站内"
                            : "站內"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {r.bannedUntil
                        ? new Date(r.bannedUntil).toLocaleString()
                        : locale === "en"
                          ? "Permanent"
                          : locale === "zh-Hans"
                            ? "永久"
                            : "永久"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {new Date(r.createdAt).toLocaleString()} · {by}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => revoke(r.id)}
                        disabled={loading}
                        className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/15 disabled:opacity-60"
                      >
                        {locale === "en" ? "Revoke" : locale === "zh-Hans" ? "解除" : "解除"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <div className="p-6 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "No IP bans." : locale === "zh-Hans" ? "目前没有 IP 封禁。" : "目前沒有 IP 封禁。"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

