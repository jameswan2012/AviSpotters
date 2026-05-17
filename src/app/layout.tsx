import "./globals.css";
import "./dynamic-watermark.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TopNav } from "@/components/TopNav";
import { PresencePing } from "@/components/PresencePing";
import { getCurrentUser } from "@/lib/current-user";
import { LanguageGate } from "@/components/LanguageGate";
import { getServerLocale } from "@/i18n/server";
import { cookies } from "next/headers";
import { DEFAULT_THEME, resolveTheme, THEME_COOKIE } from "@/lib/theme";
import { getMaintenanceSetting, getRegistrationSetting, getSiteBrandSetting } from "@/lib/site-settings";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { Footer } from "@/components/Footer";
import { SecurityGuard } from "@/components/SecurityGuard";

export const metadata: Metadata = {
  title: "AviSpotters｜圖庫與航空百科",
  description: "AviSpotters 是一個由航空愛好者發起並維護的圖庫與航空百科專案。非營利、公益為愛好。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();
  const { locale, hasCookie } = await getServerLocale();
  const maintenance = await getMaintenanceSetting();
  const brand = await getSiteBrandSetting();
  const registration = await getRegistrationSetting();
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value ?? DEFAULT_THEME);

  return (
    <html lang={locale} className={theme === "dark" ? "dark" : ""} data-theme={theme}>
      <body className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-sky-950 dark:text-slate-100">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-1/2 top-[-18vh] h-[min(62vw,620px)] w-[min(62vw,620px)] -translate-x-1/2 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />
          <div className="absolute right-[-14vw] top-[10vh] h-[min(44vw,420px)] w-[min(44vw,420px)] rounded-full bg-slate-900/5 blur-3xl dark:bg-white/5" />
          <div className="absolute left-[-18vw] bottom-[-18vh] h-[min(52vw,520px)] w-[min(52vw,520px)] rounded-full bg-sky-200/15 blur-3xl dark:bg-sky-400/10" />
        </div>

        <TopNav user={user} locale={locale} theme={theme} logoUrl={brand.logoUrl} registrationEnabled={registration.enabled} />
        <PresencePing enabled={!!user} />
        <SecurityGuard enabled={(user?.roleId ?? 0) < 4} />
        <LanguageGate serverHasCookie={hasCookie} />
        <MaintenanceGate enabled={maintenance.enabled} message={maintenance.message} roleId={user?.roleId ?? 0} locale={locale} />
        <main className="w-full px-4 py-6 sm:px-6 md:py-8 lg:px-10 2xl:px-14">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}

