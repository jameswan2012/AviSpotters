import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/shared";

function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export type HomeOverride = {
  heroBadge?: string;
  heroTitle?: string;
  heroDesc?: string;
  toolboxTitle?: string;
  toolboxDesc?: string;
  toolboxItems?: { title: string; desc: string; href?: string }[];
};

export type AboutOverride = {
  heroBadge?: string;
  heroTitle?: string;
  heroDesc?: string;
  contactTitle?: string;
  contactDesc?: string;
  contactItems?: { label: string; value: string; href?: string }[];
  groups?: { title: string; desc?: string; members: { userId: string; role?: string; note?: string; avatarUrl?: string; href?: string }[] }[];
  alumniTitle?: string;
  alumniDesc?: string;
  alumni?: { userId: string; role?: string; note?: string; avatarUrl?: string; href?: string }[];
};

export type SimplePageOverride = {
  description?: string;
};

type PageContentBlob<T> = {
  ["zh-Hant"]?: T;
  ["zh-Hans"]?: T;
  en?: T;
};

function isLocaleBlob(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.includes("zh-Hant") || keys.includes("zh-Hans") || keys.includes("en");
}

function hasMeaningfulContent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulContent(item));
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some((item) => hasMeaningfulContent(item));
  return false;
}

async function getPageOverride<T>(slug: string, locale: Locale): Promise<T | null> {
  const row = await prisma.pageContent.findUnique({ where: { slug }, select: { contentJson: true } });
  if (!row) return null;
  const parsed = safeJson<unknown>(row.contentJson, null);
  if (!parsed) return null;
  if (!isLocaleBlob(parsed)) {
    const value = parsed as T;
    return hasMeaningfulContent(value) ? value : null;
  }
  const blob = parsed as PageContentBlob<T>;
  const candidates = [blob[locale], blob["zh-Hant"], blob["zh-Hans"], blob.en];
  for (const candidate of candidates) {
    if (hasMeaningfulContent(candidate)) return candidate as T;
  }
  return null;
}

export async function getHomeOverride(locale: Locale): Promise<HomeOverride | null> {
  return getPageOverride<HomeOverride>("home", locale);
}

export async function getAboutOverride(locale: Locale): Promise<AboutOverride | null> {
  return getPageOverride<AboutOverride>("about", locale);
}

export async function getShopOverride(locale: Locale): Promise<SimplePageOverride | null> {
  return getPageOverride<SimplePageOverride>("shop", locale);
}

export async function getLotteryOverride(locale: Locale): Promise<SimplePageOverride | null> {
  return getPageOverride<SimplePageOverride>("lottery", locale);
}
