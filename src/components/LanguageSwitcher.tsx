"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, SUPPORTED_LOCALES } from "@/i18n/shared";
import { LOCALE_CHANGED_EVENT } from "@/i18n/client-locale";

const LABELS: Record<Locale, string> = {
  "zh-Hant": "繁體",
  "zh-Hans": "简体",
  en: "EN",
};

export function LanguageSwitcher({ initialLocale }: { initialLocale: Locale }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocale(initialLocale);
  }, [initialLocale]);

  const options = useMemo(
    () => SUPPORTED_LOCALES.map((l) => ({ value: l, label: LABELS[l] })),
    []
  );

  async function setServerLocale(nextLocale: Locale) {
    setLoading(true);
    try {
      // Optimistic: write cookie immediately to avoid waiting network.
      try {
        document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // ignore
      }
      // Best-effort server sync (doesn't block UI).
      void fetch("/api/i18n/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      setLocale(nextLocale);
      window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => setServerLocale((e.target.value as Locale) || DEFAULT_LOCALE)}
        disabled={loading}
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-900 outline-none hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
        aria-label="Language"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-white text-slate-900 dark:bg-sky-950 dark:text-slate-100">
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-slate-500 dark:text-slate-300">
        <Chevron />
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5.5 7.5L10 12l4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

