"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useClientLocale } from "@/i18n/client-locale";
import { t } from "@/i18n/t";
import { AuthFeaturedCarousel } from "@/components/auth/AuthFeaturedCarousel";

export default function AuthLoginPage() {
  const locale = useClientLocale();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tr = useMemo(
    () => (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant),
    [locale]
  );

  function goBlocked(data: { email?: string | null; bannedUntil?: string | null; permanent?: boolean }) {
    const p = new URLSearchParams();
    if (data.email) p.set("email", String(data.email));
    if (data.bannedUntil) p.set("until", String(data.bannedUntil));
    if (data.permanent) p.set("permanent", "1");
    window.location.href = `/auth/blocked?${p.toString()}`;
  }

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
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        if (data?.error === "account_banned" || data?.code === "account_banned") {
          goBlocked({
            email: data?.email || null,
            bannedUntil: data?.bannedUntil || null,
            permanent: !!data?.permanent,
          });
          return;
        }
        setError(String(data?.error || tr("登入失敗", "登录失败", "Login failed")));
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError(tr("登入失敗，請稍後再試。", "登录失败，请稍后再试。", "Login failed. Please try again later."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <AuthFeaturedCarousel variant="backdrop" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
        <div className="grid w-full items-start gap-6 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-10">
          <div className="rounded-3xl border border-white/25 bg-white/95 p-6 shadow-xl shadow-slate-900/10 backdrop-blur-sm dark:border-white/10 dark:bg-sky-950/90 dark:shadow-black/40">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {tr("登入帳號", "登录账号", "Sign in")}
            </h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {tr("使用 Email、帳號名稱或手機號登入。", "使用 Email、账号名称或手机号登录。", "Use email, account name, or phone number to sign in.")}
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-slate-700 dark:text-slate-200">{t(locale, "auth.login.email")}</label>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  type="text"
                  autoComplete="username"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  placeholder={tr("帳號 / Email / 手機號", "账号 / Email / 手机号", "Account / email / phone")}
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                    placeholder={t(locale, "auth.login.passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    {showPassword ? t(locale, "auth.password.hide") : t(locale, "auth.password.show")}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-100">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
              >
                {loading ? t(locale, "auth.login.submitting") : t(locale, "auth.login.submit")}
              </button>
            </form>

            <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">
              {tr("還沒有帳號？", "还没有账号？", "No account yet?")}{" "}
              <Link href="/register" className="font-semibold text-sky-700 hover:underline dark:text-sky-300">
                {t(locale, "nav.register")}
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-3xl border border-white/20 bg-black/20 p-6 text-white backdrop-blur">
              <div className="text-3xl font-black tracking-tight">{tr("航空影像社群", "航空影像社区", "Aviation community")}</div>
              <div className="mt-3 max-w-xl text-sm leading-6 text-white/85">
                {tr(
                  "登入後即可查看個人主頁、投稿、影片與站內互動功能。",
                  "登录后即可查看个人主页、投稿、视频与站内互动功能。",
                  "Sign in to access your profile, uploads, videos, and community features."
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
