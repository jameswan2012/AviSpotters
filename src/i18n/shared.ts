export const LOCALE_COOKIE = "avispotters_locale";

export const SUPPORTED_LOCALES = ["zh-Hant", "zh-Hans", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-Hant";

export function isLocale(input: string): input is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(input);
}

export function resolveLocale(input?: string | null): Locale {
  if (!input) return DEFAULT_LOCALE;
  return isLocale(input) ? input : DEFAULT_LOCALE;
}

