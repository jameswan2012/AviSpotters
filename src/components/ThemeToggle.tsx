"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";
import type { Locale } from "@/i18n/shared";

export function ThemeToggle({ initialTheme, locale }: { initialTheme: Theme; locale: Locale }) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  async function setServerTheme(nextTheme: Theme) {
    setLoading(true);
    try {
      await fetch("/api/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: nextTheme }),
      });
      setTheme(nextTheme);
      try {
        const root = document.documentElement;
        if (nextTheme === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
      } catch {
        // ignore
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === "dark";
  const label = locale === "en" ? (isDark ? "Dark" : "Light") : locale === "zh-Hans" ? (isDark ? "深色" : "浅色") : isDark ? "深色" : "淺色";
  const title = locale === "en" ? (isDark ? "Dark mode" : "Light mode") : locale === "zh-Hans" ? (isDark ? "深色模式" : "浅色模式") : isDark ? "深色模式" : "淺色模式";

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => setServerTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
      aria-label="Theme"
      title={title}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M10 2.5v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 15.5v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2.5 10h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 10h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4.3 4.3l1.4 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.3 14.3l1.4 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.7 4.3l-1.4 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.7 14.3l-1.4 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16 12.2A6.4 6.4 0 0 1 7.8 4a5.6 5.6 0 1 0 8.2 8.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

