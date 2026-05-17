"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, SUPPORTED_LOCALES } from "@/i18n/shared";
import { LOCALE_CHANGED_EVENT } from "@/i18n/client-locale";

const LABELS: Record<Locale, { title: string; subtitle: string }> = {
  "zh-Hant": { title: "選擇語言", subtitle: "預設為繁體，可隨時在右上角切換。" },
  "zh-Hans": { title: "选择语言", subtitle: "默认繁体，可随时在右上角切换。" },
  en: { title: "Choose language", subtitle: "Default is Traditional Chinese. You can switch anytime." },
};

const BUTTON: Record<Locale, string> = {
  "zh-Hant": "繼續",
  "zh-Hans": "继续",
  en: "Continue",
};

const LOCALE_LABEL: Record<Locale, string> = {
  "zh-Hant": "繁體",
  "zh-Hans": "简体",
  en: "English",
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length < 2) return null;
  return parts.pop()!.split(";").shift() ?? null;
}

export function LanguageGate({ serverHasCookie }: { serverHasCookie: boolean }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(!serverHasCookie);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cookie = readCookie(LOCALE_COOKIE);
    if (cookie) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, []);

  const title = useMemo(() => LABELS[locale].title, [locale]);
  const subtitle = useMemo(() => LABELS[locale].subtitle, [locale]);

  function close(useLocale?: Locale) {
    const next = useLocale ?? locale ?? DEFAULT_LOCALE;
    try {
      document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // ignore
    }
    setOpen(false);
    window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
    router.refresh();
  }

  async function confirm() {
    setLoading(true);
    try {
      // Optimistic: write cookie immediately to avoid slow network blocking entry.
      try {
        document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // ignore
      }
      void fetch("/api/i18n/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      setOpen(false);
      window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // Allow closing with ESC.
  useEffect(() => {
    if (!open) return;
    // Don't block admin area with language modal (important during maintenance).
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(DEFAULT_LOCALE);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pathname]);

  if (!open) return null;
  // Don't block admin area with language modal (important during maintenance).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(DEFAULT_LOCALE);
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-sky-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{title}</div>
            <div className="mt-2 text-sm leading-6 text-slate-200">{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => close(DEFAULT_LOCALE)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 text-white/90 hover:bg-white/10"
            aria-label={locale === "en" ? "Close" : locale === "zh-Hans" ? "关闭" : "關閉"}
            title={locale === "en" ? "Close" : locale === "zh-Hans" ? "关闭" : "關閉"}
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={[
                "rounded-xl border px-3 py-3 text-sm font-semibold",
                l === locale
                  ? "border-sky-400/40 bg-sky-500/15 text-white"
                  : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
              ].join(" ")}
            >
              {LOCALE_LABEL[l]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? "…" : BUTTON[locale]}
        </button>

        <button
          type="button"
          onClick={() => close(DEFAULT_LOCALE)}
          disabled={loading}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-60"
        >
          {locale === "en" ? "Use default & continue" : locale === "zh-Hans" ? "使用默认并继续" : "使用預設並繼續"}
        </button>
      </div>
    </div>
  );
}

