"use client";

import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useClientLocale } from "@/i18n/client-locale";

function formatRemaining(targetIso: string, locale: "en" | "zh-Hans" | "zh-Hant") {
  const t = new Date(targetIso).getTime();
  if (!Number.isFinite(t)) return targetIso;
  const ms = t - Date.now();
  if (ms <= 0) return locale === "en" ? "Expired" : locale === "zh-Hans" ? "已到期" : "已到期";

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (locale === "en") return `${days}d ${hours}h ${minutes}m`;
  return `${days} 天 ${hours} 小時 ${minutes} 分鐘`;
}

function BlockedPageInner() {
  const locale = useClientLocale();
  const search = useSearchParams();
  const type = (search.get("type") || "account").trim();
  const email = (search.get("email") || "").trim();
  const ip = (search.get("ip") || "").trim();
  const bannedUntil = (search.get("until") || "").trim();
  const permanent = (search.get("permanent") || "").trim() === "1" || !bannedUntil;

  const remaining = useMemo(() => {
    if (permanent || !bannedUntil) return null;
    return formatRemaining(bannedUntil, locale);
  }, [bannedUntil, locale, permanent]);

  useEffect(() => {
    document.body.setAttribute("data-blocked-screen", "1");
    return () => {
      document.body.removeAttribute("data-blocked-screen");
    };
  }, []);

  return (
    <div className="blocked-enter blocked-bg-animated fixed inset-0 z-[9999] text-center text-white">
      <div className="absolute left-1/2 top-1/2 flex w-[min(92vw,56rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center px-6">
        <div className="blocked-logo-enter mb-10 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/site/logo?variant=light" alt="logo" className="h-28 w-auto object-contain sm:h-32" />
        </div>

        <div className="blocked-logo-enter text-2xl font-semibold sm:text-3xl">
          {type === "ip"
            ? locale === "en"
              ? "This IP is banned"
              : locale === "zh-Hans"
                ? "该 IP 已被封禁"
                : "此 IP 已被封禁"
            : locale === "en"
              ? "This account is banned"
              : locale === "zh-Hans"
                ? "该账号已被封禁"
                : "此帳號已被封禁"}
        </div>
        <div className="blocked-logo-enter mt-5 text-lg text-white/95 sm:text-xl">
          {type === "ip"
            ? ip || (locale === "en" ? "Unknown IP" : locale === "zh-Hans" ? "未知 IP" : "未知 IP")
            : email || (locale === "en" ? "Unknown email" : locale === "zh-Hans" ? "未知邮箱" : "未知 Email")}
        </div>

        <div className="blocked-logo-enter mt-2 text-xl font-semibold text-white sm:text-2xl">
          {permanent
            ? locale === "en"
              ? "Permanent ban"
              : locale === "zh-Hans"
                ? "永久封禁"
                : "永久封禁"
            : locale === "en"
              ? `Remaining: ${remaining}`
              : locale === "zh-Hans"
                ? `剩余时长：${remaining}`
                : `剩餘時長：${remaining}`}
        </div>

        <div className="blocked-logo-enter mt-10">
          <Link
            href="/auth/login"
            className="inline-flex min-w-44 justify-center rounded-xl bg-white px-8 py-3 text-lg font-semibold text-red-700 shadow-lg shadow-red-950/30 hover:-translate-y-0.5 hover:bg-red-100"
          >
            {locale === "en" ? "Back" : locale === "zh-Hans" ? "返回" : "返回"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BlockedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <BlockedPageInner />
    </Suspense>
  );
}

