"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { t } from "@/i18n/t";
import { useClientLocale } from "@/i18n/client-locale";

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = useClientLocale();

  const title = useMemo(() => (locale === "en" ? "Admin login" : locale === "zh-Hans" ? "管理员登录" : "管理員登入"), [locale]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? (locale === "en" ? "Login failed" : locale === "zh-Hans" ? "登录失败" : "登入失敗"));
        return;
      }
      window.location.href = "/admin";
    } catch {
      setError(
        locale === "en"
          ? "Login failed. Please try again later."
          : locale === "zh-Hans"
            ? "登录失败，请稍后再试。"
            : "登入失敗，請稍後再試。"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid w-full items-start gap-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en" ? "Back to" : locale === "zh-Hans" ? "返回" : "返回"}{" "}
          <Link href="/" className="text-sky-700 hover:underline dark:text-sky-300">
            {locale === "en" ? "home" : locale === "zh-Hans" ? "首页" : "首頁"}
          </Link>
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">{t(locale, "auth.login.email")}</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              type="text"
              autoComplete="username"
              required
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white dark:placeholder:text-slate-400"
              placeholder={t(locale, "auth.login.emailPlaceholder")}
            />
          </div>

          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">{t(locale, "auth.login.password")}</label>
            <div className="mt-2 flex gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white dark:placeholder:text-slate-400"
                placeholder={t(locale, "auth.login.passwordPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {showPassword ? t(locale, "auth.password.hide") : t(locale, "auth.password.show")}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-100">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60">
            {loading ? t(locale, "auth.login.submitting") : t(locale, "auth.login.submit")}
          </button>
        </form>
      </div>

      <aside className="hidden space-y-4 lg:block">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(locale, "app.name")}</div>
          <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Use this page to sign in during maintenance."
              : locale === "zh-Hans"
                ? "维护期间可使用此页面登录后台。"
                : "維護期間可使用此頁面登入後台。"}
          </div>
        </div>
      </aside>
    </div>
  );
}

