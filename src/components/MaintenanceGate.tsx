"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

export function MaintenanceGate({
  enabled,
  roleId,
  locale,
  message,
}: {
  enabled: boolean;
  roleId: number;
  locale: "zh-Hant" | "zh-Hans" | "en";
  message?: string;
}) {
  const pathname = usePathname() || "/";
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);

  const blocked = enabled && roleId < 2 && !isAdminArea;
  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl dark:bg-sky-950 dark:text-slate-100">
        <div className="text-lg font-extrabold">{tr("維護中", "维护中", "Maintenance mode")}</div>
        <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
          {message?.trim()
            ? message.trim()
            : tr(
                "本站目前正在維護。審核員以上仍可進入管理面板處理工作，攝影師請稍後再來。",
                "本站目前正在维护。审核员以上仍可进入管理面板处理工作，摄影师请稍后再来。",
                "The site is under maintenance. Screeners and above can still access the admin panel."
              )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
            {tr("前往 /admin", "前往 /admin", "Go to /admin")}
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("重新整理", "刷新", "Refresh")}
          </button>
        </div>
      </div>
    </div>
  );
}

