"use client";

import { useEffect, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type Ban = {
  id: string;
  reason: string | null;
  scope?: "local" | "global";
  bannedUntil: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string };
};

export function UserBanPanel({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const locale = useClientLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ban, setBan] = useState<Ban | null>(null);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"local" | "global">("local");
  const [duration, setDuration] = useState<"permanent" | "until">("permanent");
  const [until, setUntil] = useState<string>("");

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`);
      const json = (await res.json()) as { ban: Ban | null; error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Load failed" : locale === "zh-Hans" ? "读取失败" : "讀取失敗")
        );
      setBan(json.ban);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : locale === "en" ? "Load failed" : locale === "zh-Hans" ? "读取失败" : "讀取失敗"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function banUser() {
    if (!canEdit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || null,
          scope,
          bannedUntil: duration === "until" ? until.trim() || null : null,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Ban failed" : locale === "zh-Hans" ? "封禁失败" : "封禁失敗")
        );
      setReason("");
      setScope("local");
      setDuration("permanent");
      setUntil("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : locale === "en" ? "Ban failed" : locale === "zh-Hans" ? "封禁失败" : "封禁失敗");
    } finally {
      setLoading(false);
    }
  }

  async function unban() {
    if (!canEdit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Unban failed" : locale === "zh-Hans" ? "解除失败" : "解除失敗")
        );
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : locale === "en" ? "Unban failed" : locale === "zh-Hans" ? "解除失败" : "解除失敗"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5">
      <div className="text-sm font-semibold text-red-100">
        {locale === "en" ? "Account ban" : locale === "zh-Hans" ? "封禁（账号）" : "封禁（帳號）"}
      </div>
      <div className="mt-2 text-sm text-red-100/90">
        {locale === "en" ? "Banned users cannot sign in." : locale === "zh-Hans" ? "封禁账号后，用户无法登录。" : "封禁帳號後，使用者無法登入。"}
      </div>

      {ban ? (
        <div className="mt-4 rounded-xl border border-red-400/25 bg-black/10 p-4 text-sm text-red-50">
          <div className="font-semibold">{locale === "en" ? "Currently banned" : locale === "zh-Hans" ? "当前封禁中" : "目前封禁中"}</div>
          <div className="mt-2 text-xs opacity-90">{locale === "en" ? "Reason" : locale === "zh-Hans" ? "原因" : "原因"}：{ban.reason ?? "—"}</div>
          <div className="mt-1 text-xs opacity-90">
            {locale === "en" ? "Scope" : locale === "zh-Hans" ? "范围" : "範圍"}：
            {ban.scope === "global"
              ? locale === "en"
                ? "Global (federated)"
                : locale === "zh-Hans"
                  ? "全站联合"
                  : "全站聯合"
              : locale === "en"
                ? "Local site only"
                : locale === "zh-Hans"
                  ? "仅站内"
                  : "僅站內"}
          </div>
          <div className="mt-1 text-xs opacity-90">
            {locale === "en" ? "Expire" : locale === "zh-Hans" ? "到期" : "到期"}：
            {ban.bannedUntil
              ? new Date(ban.bannedUntil).toLocaleString()
              : locale === "en"
                ? "Permanent"
                : locale === "zh-Hans"
                  ? "永久"
                  : "永久"}
          </div>
          <div className="mt-1 text-xs opacity-80">
            {locale === "en"
              ? `By ${ban.createdBy.name ?? ban.createdBy.email} at ${new Date(ban.createdAt).toLocaleString()}`
              : locale === "zh-Hans"
                ? `由 ${ban.createdBy.name ?? ban.createdBy.email} 于 ${new Date(ban.createdAt).toLocaleString()} 设置`
                : `由 ${ban.createdBy.name ?? ban.createdBy.email} 於 ${new Date(ban.createdAt).toLocaleString()} 設定`}
          </div>
          {canEdit ? (
            <button
              type="button"
              disabled={loading}
              onClick={unban}
              className="mt-3 rounded-xl bg-red-300 px-3 py-2 text-sm font-semibold text-red-950 hover:bg-red-200 disabled:opacity-60"
            >
              {locale === "en" ? "Unban" : locale === "zh-Hans" ? "解除封禁" : "解除封禁"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block">
            <div className="text-xs font-semibold text-red-100/90">
              {locale === "en" ? "Scope" : locale === "zh-Hans" ? "封禁范围" : "封禁範圍"}
            </div>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value === "global" ? "global" : "local")}
              className="mt-2 w-full rounded-xl border border-red-400/20 bg-black/10 px-3 py-2 text-sm text-red-50 outline-none focus:border-red-300/40"
              disabled={!canEdit || loading}
            >
              <option value="local">{locale === "en" ? "Local site only" : locale === "zh-Hans" ? "仅站内" : "僅站內"}</option>
              <option value="global">{locale === "en" ? "Global (federated)" : locale === "zh-Hans" ? "全站联合" : "全站聯合"}</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-red-100/90">
              {locale === "en" ? "Reason (optional)" : locale === "zh-Hans" ? "原因（可选）" : "原因（選填）"}
            </div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-xl border border-red-400/20 bg-black/10 px-3 py-2 text-sm text-red-50 outline-none placeholder:text-red-100/60 focus:border-red-300/40"
              placeholder={locale === "en" ? "e.g. spam / theft…" : locale === "zh-Hans" ? "例如：恶意刷屏、盗图…" : "例如：惡意洗版、盜圖…"}
              disabled={!canEdit || loading}
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold text-red-100/90">
              {locale === "en" ? "Duration" : locale === "zh-Hans" ? "时效" : "時效"}
            </div>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value === "until" ? "until" : "permanent")}
              className="mt-2 w-full rounded-xl border border-red-400/20 bg-black/10 px-3 py-2 text-sm text-red-50 outline-none placeholder:text-red-100/60 focus:border-red-300/40"
              disabled={!canEdit || loading}
            >
              <option value="permanent">{locale === "en" ? "Permanent" : locale === "zh-Hans" ? "永久" : "永久"}</option>
              <option value="until">{locale === "en" ? "Expire at date" : locale === "zh-Hans" ? "到指定日期" : "到指定日期"}</option>
            </select>
          </label>
          {duration === "until" ? (
            <label className="block md:col-span-2">
              <div className="text-xs font-semibold text-red-100/90">
                {locale === "en" ? "Expire at" : locale === "zh-Hans" ? "到期时间" : "到期時間"}
              </div>
              <input
                type="datetime-local"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="mt-2 w-full rounded-xl border border-red-400/20 bg-black/10 px-3 py-2 text-sm text-red-50 outline-none placeholder:text-red-100/60 focus:border-red-300/40"
                disabled={!canEdit || loading}
              />
            </label>
          ) : null}

          {canEdit ? (
            <div className="md:col-span-4 flex justify-end">
              <button
                type="button"
                disabled={loading || (duration === "until" && !until)}
                onClick={banUser}
                className="rounded-xl bg-red-300 px-4 py-2 text-sm font-semibold text-red-950 hover:bg-red-200 disabled:opacity-60"
              >
                {locale === "en" ? "Ban" : locale === "zh-Hans" ? "封禁" : "封禁"}
              </button>
            </div>
          ) : null}
        </div>
      )}
      {!ban && scope === "global" ? (
        <div className="mt-3 text-xs text-red-100/80">
          {locale === "en"
            ? "Global mode will also sync to the federated ban API."
            : locale === "zh-Hans"
              ? "全站联合模式会同步到联合封禁 API。"
              : "全站聯合模式會同步到聯合封禁 API。"}
        </div>
      ) : null}

      {error ? <div className="mt-3 text-sm text-red-100">{error}</div> : null}
      {!ban && !canEdit ? (
        <div className="mt-3 text-xs text-red-100/80">
          {locale === "en"
            ? "Admin+ permission required to ban/unban."
            : locale === "zh-Hans"
              ? "需要管理员或以上权限才可封禁/解除。"
              : "需要管理員或以上權限才可封禁/解除。"}
        </div>
      ) : null}
    </div>
  );
}

