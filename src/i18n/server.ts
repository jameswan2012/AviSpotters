import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale } from "@/i18n/shared";

export async function getServerLocale(): Promise<{ locale: ReturnType<typeof resolveLocale>; hasCookie: boolean }> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  return { locale: resolveLocale(raw), hasCookie: raw != null };
}

export async function getServerLocaleOnly() {
  const { locale } = await getServerLocale();
  return locale;
}

export async function getLocaleCookieValue(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(LOCALE_COOKIE)?.value ?? null;
}

export { DEFAULT_LOCALE, LOCALE_COOKIE };

