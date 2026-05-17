"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientLocale } from "@/i18n/client-locale";

type UserPayload = {
  id: string;
  email: string;
  name: string | null;
  points: number;
  roleId: number;
  uploadDisabled: boolean;
  deletedAt: string | null;
  createdAt: string;
  lastLoginIp?: string | null;
  lastLoginAt?: string | null;
  lastLoginUserAgent?: string | null;
};

export function UserEditorForm({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const router = useRouter();
  const locale = useClientLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [uploadDisabled, setUploadDisabled] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lastLoginIp, setLastLoginIp] = useState<string | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`);
        const json = (await res.json()) as { user?: UserPayload; error?: string };
        if (!res.ok || !json.user)
          throw new Error(
            json.error || (locale === "en" ? "Load failed" : locale === "zh-Hans" ? "读取失败" : "讀取失敗")
          );
        if (cancelled) return;
        setEmail(json.user.email);
        setName(json.user.name ?? "");
        setUploadDisabled(!!json.user.uploadDisabled);
        setLastLoginIp((json.user as any).lastLoginIp ?? null);
        setLastLoginAt((json.user as any).lastLoginAt ?? null);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : locale === "en" ? "Load failed" : locale === "zh-Hans" ? "读取失败" : "讀取失敗"
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, locale]);

  async function onSave() {
    setError(null);
    setOk(null);
    if (!canEdit) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name: name.trim() || null,
          uploadDisabled,
          password: password.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok)
        throw new Error(
          json.error || (locale === "en" ? "Save failed" : locale === "zh-Hans" ? "保存失败" : "儲存失敗")
        );
      setOk(locale === "en" ? "Saved" : locale === "zh-Hans" ? "已保存" : "已儲存");
      setPassword("");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : locale === "en" ? "Save failed" : locale === "zh-Hans" ? "保存失败" : "儲存失敗"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="text-sm text-slate-700 dark:text-slate-200">
        {locale === "en" ? "Loading…" : locale === "zh-Hans" ? "读取中…" : "讀取中…"}
      </div>
    );

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
      {ok ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{ok}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">
          {locale === "en" ? "Profile" : locale === "zh-Hans" ? "基本信息" : "基本資料"}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <Input value={email} onChange={setEmail} disabled={!canEdit} placeholder="user@example.com" />
          </Field>
          <Field label={locale === "en" ? "Nickname" : locale === "zh-Hans" ? "昵称" : "暱稱"}>
            <Input value={name} onChange={setName} disabled={!canEdit} placeholder={locale === "en" ? "(optional)" : locale === "zh-Hans" ? "（可留空）" : "（可留空）"} />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoMini label={locale === "en" ? "Last login IP" : locale === "zh-Hans" ? "最近登录 IP" : "最近登入 IP"} value={lastLoginIp ?? "—"} />
          <InfoMini
            label={locale === "en" ? "Last login time" : locale === "zh-Hans" ? "最近登录时间" : "最近登入時間"}
            value={
              lastLoginAt
                ? (() => {
                    const d = new Date(lastLoginAt);
                    if (Number.isNaN(d.getTime())) return "—";
                    const minutes = -d.getTimezoneOffset();
                    const sign = minutes >= 0 ? "+" : "-";
                    const abs = Math.abs(minutes);
                    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
                    const mm = String(abs % 60).padStart(2, "0");
                    return `${d.toLocaleString()} (UTC${sign}${hh}:${mm})`;
                  })()
                : "—"
            }
          />
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-sky-950/30">
          <input type="checkbox" checked={uploadDisabled} onChange={(e) => setUploadDisabled(e.target.checked)} disabled={!canEdit} className="mt-1 h-4 w-4" />
          <div className="text-sm leading-6 text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Disable uploads (upload API returns 403)."
              : locale === "zh-Hans"
                ? "禁止上传作品（勾选后，上传 API 会返回 403）"
                : "禁止上傳作品（被勾選後，上傳 API 會回 403）"}
          </div>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">
          {locale === "en" ? "Reset password" : locale === "zh-Hans" ? "重置密码" : "重設密碼"}
        </div>
        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {locale === "en"
            ? "Leave empty to keep unchanged. At least 6 characters."
            : locale === "zh-Hans"
              ? "留空则不变更。至少 6 位。"
              : "留空則不變更。至少 6 碼。"}
        </div>
        <div className="mt-4">
          <div className="flex gap-2">
            <Input
              value={password}
              onChange={setPassword}
              disabled={!canEdit}
              placeholder={locale === "en" ? "New password (optional)" : locale === "zh-Hans" ? "新密码（可选）" : "新密碼（選填）"}
              type={showPassword ? "text" : "password"}
            />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setShowPassword((s) => !s)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {showPassword ? (locale === "en" ? "Hide" : locale === "zh-Hans" ? "隐藏" : "隱藏") : locale === "en" ? "Show" : locale === "zh-Hans" ? "显示" : "顯示"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={!canEdit || saving}
          className={[
            "rounded-xl px-4 py-2 text-sm font-semibold",
            !canEdit || saving ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-400" : "bg-sky-500 text-sky-950 hover:bg-sky-400",
          ].join(" ")}
        >
          {saving ? (locale === "en" ? "Saving…" : locale === "zh-Hans" ? "保存中…" : "儲存中…") : locale === "en" ? "Save" : locale === "zh-Hans" ? "保存" : "儲存"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-sky-50 px-3 py-2.5 dark:border-white/10 dark:bg-sky-950/30">
      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      type={type ?? "text"}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 disabled:opacity-60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
    />
  );
}

