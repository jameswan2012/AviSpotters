import type { Locale } from "@/i18n/shared";

export type PhotoCategoryGroup = "domain" | "tag" | "exclusive" | "legacy";

export type PhotoCategoryDef = {
  id: string;
  group: PhotoCategoryGroup;
  zhHant: string;
  zhHans: string;
  en: string;
  enabled?: boolean;
};

export type PhotoCategorySetting = {
  version: 1;
  categories: PhotoCategoryDef[];
};

export type PhotoCategoryId = string;

export const PHOTO_CATEGORIES_DEFAULT: PhotoCategoryDef[] = [
  // Required domain (pick one)
  { id: "domain_civil", group: "domain", zhHant: "民航", zhHans: "民航", en: "Civil", enabled: true },
  { id: "domain_military", group: "domain", zhHant: "軍用航空", zhHans: "军用航空", en: "Military", enabled: true },

  // Multi-select tags
  { id: "special_livery", group: "tag", zhHant: "特殊塗裝", zhHans: "特殊涂装", en: "Special Livery", enabled: true },
  { id: "airport", group: "tag", zhHant: "機場", zhHans: "机场", en: "Airport", enabled: true },
  { id: "cabin", group: "tag", zhHant: "客艙", zhHans: "客舱", en: "Cabin", enabled: true },
  { id: "cockpit", group: "tag", zhHant: "駕駛艙", zhHans: "驾驶舱", en: "Cockpit", enabled: true },
  { id: "night_shot", group: "tag", zhHant: "夜拍", zhHans: "夜拍", en: "Night Shot", enabled: true },
  { id: "wing_view", group: "tag", zhHant: "機翼視角", zhHans: "机翼视角", en: "Wing View", enabled: true },
  { id: "airshow", group: "tag", zhHant: "航展", zhHans: "航展", en: "Airshow", enabled: true },

  // Exclusive (pick at most one)
  { id: "helicopter", group: "exclusive", zhHant: "直升機", zhHans: "直升机", en: "Helicopter", enabled: true },
  { id: "business_jet", group: "exclusive", zhHant: "公務機", zhHans: "公务机", en: "Business Jet", enabled: true },
  { id: "special_plane", group: "exclusive", zhHant: "專機", zhHans: "专机", en: "Special Plane", enabled: true },
  { id: "general_aviation", group: "exclusive", zhHant: "通用航空", zhHans: "通用航空", en: "General Aviation", enabled: true },
  { id: "fighter_aircraft", group: "exclusive", zhHant: "戰鬥機", zhHans: "战斗机", en: "Fighter Aircraft", enabled: true },

  // Legacy IDs (kept for displaying older photos; not selectable by default)
  { id: "freighter", group: "legacy", zhHant: "貨機", zhHans: "货机", en: "Freighter", enabled: false },
  { id: "incident", group: "legacy", zhHant: "事故", zhHans: "事故", en: "Incident", enabled: false },
  { id: "spacecraft", group: "legacy", zhHant: "航天器", zhHans: "航天器", en: "Spacecraft", enabled: false },
] as const;

export const DEFAULT_PHOTO_CATEGORY_SETTING: PhotoCategorySetting = {
  version: 1,
  categories: [...PHOTO_CATEGORIES_DEFAULT],
};

function buildCategoryMap(setting?: PhotoCategorySetting) {
  const map = new Map<string, PhotoCategoryDef>();
  for (const c of PHOTO_CATEGORIES_DEFAULT) map.set(c.id, c);
  const arr = setting?.categories;
  if (Array.isArray(arr)) {
    for (const c of arr) {
      if (!c || typeof c !== "object") continue;
      const id = typeof (c as any).id === "string" ? String((c as any).id).trim() : "";
      if (!id) continue;
      const group = (c as any).group as PhotoCategoryGroup;
      if (group !== "domain" && group !== "tag" && group !== "exclusive" && group !== "legacy") continue;
      map.set(id, {
        id,
        group,
        zhHant: String((c as any).zhHant ?? id),
        zhHans: String((c as any).zhHans ?? id),
        en: String((c as any).en ?? id),
        enabled: (c as any).enabled === false ? false : true,
      });
    }
  }
  return map;
}

export function getEnabledPhotoCategories(setting?: PhotoCategorySetting) {
  const map = buildCategoryMap(setting);
  return Array.from(map.values()).filter((c) => c.enabled !== false);
}

export function getSelectablePhotoCategories(setting?: PhotoCategorySetting) {
  return getEnabledPhotoCategories(setting).filter((c) => c.group !== "legacy");
}

export function getPhotoCategoryLabel(locale: Locale, id: string, setting?: PhotoCategorySetting): string {
  const map = buildCategoryMap(setting);
  const mapped = LEGACY_ID_TO_ID[id] ?? LEGACY_TO_ID[id] ?? id;
  const row = map.get(mapped);
  if (!row) return id;
  return locale === "en" ? row.en : locale === "zh-Hans" ? row.zhHans : row.zhHant;
}

export function isPhotoCategoryId(v: string, setting?: PhotoCategorySetting): v is PhotoCategoryId {
  const map = buildCategoryMap(setting);
  return map.has(v);
}

// Backward compatible mapping from legacy labels (stored in DB) to new IDs.
const LEGACY_TO_ID: Record<string, PhotoCategoryId | undefined> = {
  // old labels
  特種塗裝: "special_livery",
  特种涂装: "special_livery",
  風格圖: "special_livery",
  风格图: "special_livery",
  軍用: "domain_military",
  军用: "domain_military",
  軍機: "domain_military",
  军机: "domain_military",
  貨機: "freighter",
  货机: "freighter",
  直升機: "helicopter",
  直升机: "helicopter",
  航展圖: "airshow",
  航展图: "airshow",
  機場圖: "airport",
  机场图: "airport",
  駕駛艙: "cockpit",
  驾驶舱: "cockpit",
};

// Map legacy IDs (stored in DB) to new IDs.
const LEGACY_ID_TO_ID: Record<string, PhotoCategoryId | undefined> = {
  style: "special_livery",
  military: "domain_military",
};

export function normalizePhotoCategories(input: unknown, setting?: PhotoCategorySetting): PhotoCategoryId[] {
  const arr = Array.isArray(input) ? input : [];
  const map = buildCategoryMap(setting);
  const domainIds = Array.from(map.values())
    .filter((c) => c.group === "domain" && c.enabled !== false)
    .map((c) => c.id);
  const tagIds = Array.from(map.values())
    .filter((c) => c.group === "tag" && c.enabled !== false)
    .map((c) => c.id);
  const exclusiveIds = Array.from(map.values())
    .filter((c) => c.group === "exclusive" && c.enabled !== false)
    .map((c) => c.id);

  const ids: PhotoCategoryId[] = [];
  for (const x of arr) {
    const raw = typeof x === "string" ? x.trim() : "";
    if (!raw) continue;
    const mapped = LEGACY_ID_TO_ID[raw] ?? LEGACY_TO_ID[raw] ?? raw;
    if (typeof mapped === "string" && map.has(mapped) && map.get(mapped)?.enabled !== false) ids.push(mapped);
  }

  const uniq = Array.from(new Set(ids));
  // Validate: domain required exactly one; exclusive max one
  const pickedDomains = uniq.filter((id) => domainIds.includes(id));
  if (pickedDomains.length !== 1) return [];
  const pickedExclusive = uniq.filter((id) => exclusiveIds.includes(id));
  if (pickedExclusive.length > 1) return [];

  // Normalize order: domain -> tags (in config order) -> exclusive (in config order)
  const tagSet = new Set(uniq.filter((id) => tagIds.includes(id)));
  const ex = pickedExclusive[0] ?? null;
  const orderedTags = tagIds.filter((id) => tagSet.has(id));
  const orderedExclusive = ex ? [ex] : [];
  return [pickedDomains[0]!, ...orderedTags, ...orderedExclusive];
}

