"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale, type Locale } from "@/i18n/shared";

export const LOCALE_CHANGED_EVENT = "avispotters:locale-changed";

function readLocaleFromDocument(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return resolveLocale(match?.[1] ?? null);
}

export function useClientLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(readLocaleFromDocument());
  }, []);

  return locale;
}

