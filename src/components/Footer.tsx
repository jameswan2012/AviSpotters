import Link from "next/link";
import type { Locale } from "@/i18n/shared";
import { t } from "@/i18n/t";
import { getSiteFooterSetting } from "@/lib/site-settings";

function Icon({
  type,
}: {
  type: "wechat" | "qq" | "x" | "website" | "facebook" | "whatsapp" | "xiaohongshu" | "weibo";
}) {
  const cls = "h-4 w-4";
  if (type === "x") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-7.4L5.8 22H2l7.3-8.4L1 2h6.3l4.4 6.7L18.9 2Zm-1.1 18h1.7L6.2 3.9H4.4L17.8 20Z" />
      </svg>
    );
  }
  if (type === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
        <path d="M13.7 22v-8.2h2.7l.4-3.2h-3.1V8.6c0-.9.3-1.6 1.6-1.6h1.7V4.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.6v3.2h2.8V22h3.3Z" />
      </svg>
    );
  }
  if (type === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
        <path d="M20 11.9A8 8 0 0 1 8 19l-2.6 1 .9-2.5A8 8 0 1 1 20 11.9Zm-4.6 4c-.2.5-1 1-1.5 1.1-.3.1-.6.2-1.4 0-1.6-.4-3.2-1.6-4.4-3-1.1-1.3-1.8-2.6-1.8-3.6 0-1 .5-1.5.7-1.7.2-.2.4-.2.5-.2h.4c.1 0 .3 0 .4.4.2.5.6 1.5.6 1.6 0 .1 0 .3-.1.4l-.3.4c-.1.2-.2.3-.1.5.2.6.9 1.5 1.5 2 .7.6 1.6 1 2.2 1.1.2 0 .3 0 .4-.2l.5-.6c.2-.2.3-.2.5-.1.2.1 1.4.7 1.6.8.2.1.3.2.3.3 0 .1 0 .6-.2 1Z" />
      </svg>
    );
  }
  if (type === "weibo") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
        <path d="M18.4 11.3c-.6-.2-1.2-.2-1.4-.5-.2-.3.3-.9.5-1.4.4-1 .2-1.8-.7-2.3-1-.6-2.6-.5-4.1.4-1.5.9-2.7 2.2-3.4 3.7-.2.5-.4 1.1-.7 1.2-.3.1-.8-.3-1.3-.5-1-.4-1.8-.2-2.3.7-.9 1.6.4 4.4 3.2 6.2 2.8 1.9 6 1.9 7.7.2 1.8-1.7 1.5-4.9.6-6.3-.5-.8-1.2-1.1-1.9-1.3ZM9.9 19.3c-2.1 0-3.8-1.3-3.8-3s1.7-3 3.8-3 3.8 1.3 3.8 3-1.7 3-3.8 3Zm9-9.3a.9.9 0 0 1-1.2-.5c-.5-1.3-1.7-2.3-3.1-2.5a.9.9 0 0 1 .2-1.8c2 .3 3.7 1.7 4.4 3.6.2.5 0 1-.5 1.2Zm-1.9 1.5a.7.7 0 0 1-.9-.4c-.4-1.1-1.4-1.9-2.6-2.1a.7.7 0 1 1 .2-1.4c1.7.2 3 1.4 3.6 3 .1.4-.1.8-.3.9Z" />
        <path d="M10 16.6c-.6 0-1 .3-1 .7 0 .4.4.7 1 .7s1-.3 1-.7c0-.4-.4-.7-1-.7Z" />
      </svg>
    );
  }
  if (type === "xiaohongshu") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
        <path d="M6.2 7.4C6.2 5.5 7.7 4 9.6 4h4.8c1.9 0 3.4 1.5 3.4 3.4v.8h.8c1.9 0 3.4 1.5 3.4 3.4v2.8c0 1.9-1.5 3.4-3.4 3.4H9.6c-1.9 0-3.4-1.5-3.4-3.4v-.8h-.8C3.5 17.6 2 16.1 2 14.2v-2.8C2 9.5 3.5 8 5.4 8h.8v-.6Zm3.4-1.7c-.9 0-1.7.8-1.7 1.7V8h8.2v-.6c0-.9-.8-1.7-1.7-1.7H9.6Zm.5 6.2h3.8c.5 0 .9.4.9.9s-.4.9-.9.9h-1.1l1.2 1.8c.3.4.2 1-.2 1.2-.4.3-1 .2-1.2-.2l-1.4-2.1-1.4 2.1c-.3.4-.8.5-1.2.2-.4-.3-.5-.8-.2-1.2l1.2-1.8h-1.1c-.5 0-.9-.4-.9-.9s.4-.9.9-.9Z" />
      </svg>
    );
  }
  if (type === "website") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9Z" />
        <path d="M3 12h18" />
        <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z" />
      </svg>
    );
  }
  if (type === "wechat") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
        <path d="M9.5 3C5.4 3 2 5.9 2 9.5c0 2.1 1.1 3.9 2.9 5.2l-.8 2.4 2.7-1.4c.8.2 1.7.4 2.7.4.2 0 .3 0 .5 0-.2-.6-.3-1.2-.3-1.8 0-3.5 3.4-6.4 7.5-6.4.4 0 .8 0 1.2.1C16.9 5.2 13.5 3 9.5 3Zm-2 5.2c-.6 0-1.1-.5-1.1-1.1 0-.6.5-1.1 1.1-1.1.6 0 1.1.5 1.1 1.1 0 .6-.5 1.1-1.1 1.1Zm4 0c-.6 0-1.1-.5-1.1-1.1 0-.6.5-1.1 1.1-1.1.6 0 1.1.5 1.1 1.1 0 .6-.5 1.1-1.1 1.1Z" />
        <path d="M17.5 8c-3.6 0-6.5 2.4-6.5 5.3 0 1.6.9 3.1 2.4 4.1l-.6 2 2.2-1.1c.7.2 1.5.3 2.5.3 3.6 0 6.5-2.4 6.5-5.3S21.1 8 17.5 8Zm-1.8 4.3c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9Zm3.6 0c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9Z" />
      </svg>
    );
  }
  // qq
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
      <path d="M12 2c-3.3 0-6 2.7-6 6v3.2c0 .7-.3 1.4-.7 2.3-.4.9-.7 2-.7 2.8 0 .9.5 1.5 1.2 1.5.6 0 1.3-.3 1.9-.8.6.9 1.4 1.6 2.4 2-.1.3-.2.6-.2.9 0 .7.6 1.2 1.2 1.2h2c.7 0 1.2-.6 1.2-1.2 0-.3-.1-.6-.2-.9 1-.4 1.8-1.1 2.4-2 .6.5 1.3.8 1.9.8.7 0 1.2-.6 1.2-1.5 0-.8-.3-1.9-.7-2.8-.4-.9-.7-1.6-.7-2.3V8c0-3.3-2.7-6-6-6Zm-3 7.2c-.6 0-1.1-.5-1.1-1.1 0-.6.5-1.1 1.1-1.1.6 0 1.1.5 1.1 1.1 0 .6-.5 1.1-1.1 1.1Zm6 0c-.6 0-1.1-.5-1.1-1.1 0-.6.5-1.1 1.1-1.1.6 0 1.1.5 1.1 1.1 0 .6-.5 1.1-1.1 1.1Z" />
    </svg>
  );
}

export async function Footer({ locale }: { locale: Locale }) {
  const footer = await getSiteFooterSetting();
  const hasRight = footer.contactLinks.length > 0 || footer.friendLinks.length > 0 || !!footer.groupQrUrl;

  const mainLinks: Array<{ href: string; label: string }> = [
    { href: "/", label: t(locale, "nav.home") },
    { href: "/photos", label: locale === "en" ? "Gallery" : locale === "zh-Hans" ? "图库" : "圖庫" },
    { href: "/photos/featured", label: t(locale, "photos.featured") },
    { href: "/airports", label: locale === "en" ? "Airports" : locale === "zh-Hans" ? "机场" : "機場" },
    { href: "/aircraft", label: locale === "en" ? "Aircraft" : locale === "zh-Hans" ? "飞机" : "飛機" },
    { href: "/models", label: t(locale, "nav.models") },
    { href: "/leaderboard", label: t(locale, "nav.leaderboard") },
    { href: "/dashboard", label: t(locale, "nav.dashboard") },
    { href: "/tickets", label: locale === "en" ? "Tickets" : locale === "zh-Hans" ? "工单" : "工單" },
  ];

  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-gradient-to-b from-white/70 to-white/90 backdrop-blur dark:border-white/10 dark:from-slate-900/45 dark:to-slate-950/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10 2xl:px-14">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">{locale === "en" ? "Main" : locale === "zh-Hans" ? "主要功能" : "主要功能"}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {mainLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">{locale === "en" ? "Tickets" : locale === "zh-Hans" ? "工单" : "工單"}</div>
            <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
              {locale === "en"
                ? "Report bugs / feedback."
                : locale === "zh-Hans"
                  ? "反馈 BUG / 建议。"
                  : "回報 BUG / 建議。"}
            </div>
            <div className="mt-3">
              <Link href="/tickets" className="inline-flex rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-blue-500">
                {locale === "en" ? "Create ticket" : locale === "zh-Hans" ? "提交工单" : "提交工單"}
              </Link>
            </div>
          </div>

          {hasRight ? (
            <div>
              <div className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">{locale === "en" ? "Contact" : locale === "zh-Hans" ? "联系我们" : "聯絡我們"}</div>
              {footer.contactLinks.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {footer.contactLinks.map((c, idx) => (
                    <a
                      key={`${c.type}-${idx}`}
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <Icon type={c.type} />
                      <span>{c.label || c.url}</span>
                    </a>
                  ))}
                </div>
              ) : null}

              {footer.friendLinks.length ? (
                <div className="mt-5">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {locale === "en" ? "Friends" : locale === "zh-Hans" ? "友情链接" : "友情連結"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    {footer.friendLinks.map((f, idx) => (
                      <a
                        key={`${f.url}-${idx}`}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        {f.label || f.url}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {footer.groupQrUrl ? (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {locale === "en" ? "Group QR" : locale === "zh-Hans" ? "群聊二维码" : "群聊 QR"}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={footer.groupQrUrl} alt="group qr" className="mt-2 h-28 w-28 rounded-2xl border border-slate-200 bg-white object-cover dark:border-white/10 dark:bg-white/5" />
                </div>
              ) : null}
            </div>
          ) : (
            <div />
          )}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-200/70 pt-6 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} {t(locale, "app.name")}</div>
          {footer.icp ? <div className="text-slate-600 dark:text-slate-300">{footer.icp}</div> : null}
        </div>
      </div>
    </footer>
  );
}

