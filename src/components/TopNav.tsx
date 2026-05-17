import Link from "next/link";
import type { CurrentUser } from "@/lib/current-user";
import { LogoutButton } from "@/components/LogoutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Locale } from "@/i18n/shared";
import { t } from "@/i18n/t";
import { getRoleLabel, getRoleMeta } from "@/lib/roles";
import type { Theme } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";

export function TopNav({
  user,
  locale,
  theme,
  logoUrl,
  registrationEnabled,
}: {
  user: CurrentUser | null;
  locale: Locale;
  theme: Theme;
  logoUrl?: string | null;
  registrationEnabled?: boolean;
}) {
  const role = user ? getRoleMeta(user.roleId) : null;
  const roleLabel = user ? getRoleLabel(locale, user.roleId) : null;
  const displayName = user ? user.name ?? user.email : null;
  const airportsLabel = locale === "en" ? "Airports" : locale === "zh-Hans" ? "机场" : "機場";
  const photosLabel = locale === "en" ? "Gallery" : locale === "zh-Hans" ? "图库" : "圖庫";
  const aircraftLabel = locale === "en" ? "Aircraft" : locale === "zh-Hans" ? "飞机" : "飛機";
  const chatLabel = locale === "en" ? "Chat" : locale === "zh-Hans" ? "聊天" : "聊天";
  const myProfileLabel = locale === "en" ? "My profile" : locale === "zh-Hans" ? "我的主页" : "我的主頁";
  const navItemClass =
    "rounded-xl px-3 py-1.5 text-slate-700 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white";
  const mobileLinkClass =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200";
  return (
    <header className="sticky top-0 z-50">
      <div className="px-3 py-3 sm:px-5 lg:px-9 2xl:px-12">
        <div className="liquid-glass w-full rounded-2xl border border-white/30 px-3 py-2 shadow-[0_12px_36px_rgba(2,6,23,0.10)] ring-1 ring-black/5 dark:border-white/10 dark:shadow-[0_18px_40px_rgba(0,0,0,0.35)] dark:ring-white/10 sm:px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="group inline-flex items-center gap-2">
                {logoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/site/logo?variant=${theme === "dark" ? "light" : "dark"}&t=${Date.now()}`}
                      alt="logo"
                      className="h-8 w-auto max-w-[180px] object-contain sm:h-9 sm:max-w-[220px]"
                    />
                  </>
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/55 ring-1 ring-white/60 dark:bg-white/5 dark:ring-white/10">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                  </span>
                )}
                {!logoUrl ? (
                  <span className="text-sm font-semibold tracking-wide text-slate-900 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
                    {t(locale, "app.name")}
                  </span>
                ) : null}
              </Link>

              <nav className="hidden items-center gap-1 text-sm md:flex">
                <Link href="/" className={navItemClass}>
                  {t(locale, "nav.home")}
                </Link>
                <Link href="/leaderboard" className={navItemClass}>
                  {t(locale, "nav.leaderboard")}
                </Link>
                <Link href="/video" className={navItemClass}>
                  {locale === "en" ? "Videos" : locale === "zh-Hans" ? "视频" : "影片"}
                </Link>
                <Link href="/photos" className={navItemClass}>
                  {photosLabel}
                </Link>
                <Link href="/airports" className={navItemClass}>
                  {airportsLabel}
                </Link>
                <Link href="/aircraft" className={navItemClass}>
                  {aircraftLabel}
                </Link>
                <Link href="/models" className={navItemClass}>
                  {t(locale, "nav.models")}
                </Link>
                <Link href="/dashboard" className={navItemClass}>
                  {t(locale, "nav.dashboard")}
                </Link>
                {user ? (
                  <Link href="/users/me" className={navItemClass}>
                    {myProfileLabel}
                  </Link>
                ) : null}
                <Link href="/chat" className={navItemClass}>
                  {chatLabel}
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle initialTheme={theme} locale={locale} />
              <LanguageSwitcher initialLocale={locale} />
              {user ? (
                <>
                  <Link
                    href="/photos/upload"
                    className="hidden rounded-xl bg-sky-500 px-3 py-1.5 text-sm font-semibold text-sky-950 shadow-sm hover:bg-sky-400 md:inline-flex"
                  >
                    {locale === "en" ? "Upload" : locale === "zh-Hans" ? "上传" : "上傳"}
                  </Link>
                  <Link
                    href="/dashboard"
                    className={[
                      "hidden items-center rounded-xl px-2 py-1 text-sm font-semibold md:inline-flex",
                      role ? role.pillClass : "bg-white/50 text-slate-900 ring-1 ring-white/50 dark:bg-white/5 dark:text-white dark:ring-white/10",
                    ].join(" ")}
                    title={roleLabel && displayName ? `${roleLabel} · ${displayName}` : displayName ?? undefined}
                  >
                    <span className={role ? role.nameClass : "text-white"}>{displayName}</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    className="hidden rounded-xl border border-white/40 bg-white/50 px-3 py-1.5 text-sm text-slate-900 hover:bg-white/70 md:inline-flex dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                  >
                    {t(locale, "nav.points")}{" "}
                    <span className="ml-1 font-semibold text-sky-300">{user.points}</span>
                  </Link>
                  <LogoutButton locale={locale} />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl border border-white/40 bg-white/50 px-3 py-1.5 text-sm text-slate-900 hover:bg-white/70 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                  >
                    {t(locale, "nav.login")}
                  </Link>
                  {registrationEnabled ? (
                    <Link
                      href="/register"
                      className="rounded-xl bg-sky-500 px-3 py-1.5 text-sm font-semibold text-sky-950 hover:bg-sky-400"
                    >
                      {t(locale, "nav.register")}
                    </Link>
                  ) : (
                    <span className="rounded-xl border border-white/40 bg-white/50 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                      {locale === "en" ? "Registration closed" : locale === "zh-Hans" ? "注册已关闭" : "註冊已關閉"}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden">
            <Link href="/" className={mobileLinkClass}>{t(locale, "nav.home")}</Link>
            <Link href="/leaderboard" className={mobileLinkClass}>{t(locale, "nav.leaderboard")}</Link>
            <Link href="/video" className={mobileLinkClass}>{locale === "en" ? "Videos" : locale === "zh-Hans" ? "视频" : "影片"}</Link>
            <Link href="/photos" className={mobileLinkClass}>{photosLabel}</Link>
            <Link href="/airports" className={mobileLinkClass}>{airportsLabel}</Link>
            <Link href="/aircraft" className={mobileLinkClass}>{aircraftLabel}</Link>
            <Link href="/models" className={mobileLinkClass}>{t(locale, "nav.models")}</Link>
            <Link href="/dashboard" className={mobileLinkClass}>{t(locale, "nav.dashboard")}</Link>
            {user ? <Link href="/users/me" className={mobileLinkClass}>{myProfileLabel}</Link> : null}
            <Link href="/chat" className={mobileLinkClass}>{chatLabel}</Link>
            {user ? (
              <Link href="/photos/upload" className="rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-semibold text-sky-950">
                {locale === "en" ? "Upload" : locale === "zh-Hans" ? "上传" : "上傳"}
              </Link>
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
}

