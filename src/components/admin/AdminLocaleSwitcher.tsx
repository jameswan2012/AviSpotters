"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useClientLocale, LOCALE_CHANGED_EVENT } from "@/i18n/client-locale";
import { LOCALE_COOKIE, type Locale } from "@/i18n/shared";

export function AdminLocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setServerLocale(nextLocale: string) {
    if (loading || nextLocale === currentLocale) return;
    setLoading(true);
    try {
      // Set cookie client-side for immediate UI feedback
      try {
        document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // ignore
      }
      // Sync with server
      void fetch("/api/i18n/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const locales = [
    { code: "zh-Hant", label: "繁中" },
    { code: "zh-Hans", label: "简体" },
    { code: "en", label: "EN" },
  ] as const;

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-sky-950/30">
      {locales.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setServerLocale(l.code)}
          disabled={loading}
          className={[
            "rounded px-2 py-1 text-xs font-semibold transition-colors",
            currentLocale === l.code
              ? "bg-sky-500 text-sky-950"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
          ].join(" ")}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
