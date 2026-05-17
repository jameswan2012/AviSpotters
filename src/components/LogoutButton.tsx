"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t } from "@/i18n/t";
import type { Locale } from "@/i18n/shared";

export function LogoutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    try {
      setLoading(true);
      try {
        await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      } catch {
        // retry once to reduce transient gateway failures
        await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      }
      // Replace first to avoid back-navigation to authed pages
      router.replace("/");
      router.refresh();
    } catch {
      // Still redirect to recover UI even if logout API is flaky.
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
    >
      {loading ? `${t(locale, "nav.logout")}…` : t(locale, "nav.logout")}
    </button>
  );
}

