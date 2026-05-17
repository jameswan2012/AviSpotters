import Link from "next/link";
import { prisma } from "@/lib/db";
import { AirportsSearch } from "@/components/AirportsSearch";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";

type ContinentKey = "all" | "asia" | "europe" | "north-america" | "south-america" | "africa" | "oceania" | "other";

function normalizeContinent(input: string | undefined): ContinentKey {
  const s = String(input ?? "").trim().toLowerCase();
  if (s === "asia" || s === "europe" || s === "north-america" || s === "south-america" || s === "africa" || s === "oceania" || s === "other") return s;
  return "all";
}

function mapCountryToContinent(country: string | null | undefined): Exclude<ContinentKey, "all"> {
  const c = String(country ?? "").trim().toLowerCase();
  if (!c) return "other";
  if (
    /(china|中国|香港|hong kong|macao|macau|taiwan|台灣|台湾|japan|korea|singapore|thailand|malaysia|indonesia|philippines|vietnam|india|pakistan|bangladesh|sri lanka|nepal|bhutan|myanmar|cambodia|laos|uae|united arab emirates|qatar|saudi|oman|kuwait|bahrain|iran|iraq|israel|jordan|lebanon|turkey|kazakhstan|uzbekistan|kyrgyz|tajik|turkmen|mongolia)/.test(c)
  ) return "asia";
  if (
    /(united kingdom|uk|england|scotland|wales|ireland|france|germany|spain|italy|portugal|netherlands|belgium|switzerland|austria|sweden|norway|denmark|finland|iceland|poland|czech|slovakia|hungary|romania|bulgaria|greece|croatia|serbia|slovenia|bosnia|albania|latvia|lithuania|estonia|ukraine|belarus|moldova|russia|europe|欧洲|歐洲)/.test(c)
  ) return "europe";
  if (
    /(united states|usa|u\.s\.|canada|mexico|greenland|north america|北美|北美洲)/.test(c)
  ) return "north-america";
  if (
    /(brazil|argentina|chile|peru|colombia|ecuador|bolivia|uruguay|paraguay|venezuela|south america|南美|南美洲)/.test(c)
  ) return "south-america";
  if (
    /(south africa|egypt|morocco|algeria|tunisia|ethiopia|kenya|tanzania|nigeria|ghana|uganda|africa|非洲)/.test(c)
  ) return "africa";
  if (
    /(australia|new zealand|fiji|papua|guam|oceania|大洋洲)/.test(c)
  ) return "oceania";
  return "other";
}

function codeOf(a: { iata: string | null; icao: string | null }) {
  return a.iata ?? a.icao ?? "";
}

export default async function AirportsIndexPage({ searchParams }: { searchParams: Promise<{ continent?: string }> }) {
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const continent = normalizeContinent(sp.continent);
  const airports = await prisma.airport.findMany({
    orderBy: [{ iata: "asc" }, { icao: "asc" }, { nameZh: "asc" }],
    select: {
      iata: true,
      icao: true,
      nameZh: true,
      nameEn: true,
      city: true,
      province: true,
      country: true,
      category: true,
      nature: true,
    },
  });

  const filtered = airports
    .filter((a) => continent === "all" || mapCountryToContinent(a.country) === continent)
    .sort((a, b) => {
      const ac = codeOf(a);
      const bc = codeOf(b);
      const c = ac.localeCompare(bc, "en", { sensitivity: "base" });
      if (c !== 0) return c;
      return (a.nameEn || a.nameZh).localeCompare(b.nameEn || b.nameZh, "en", { sensitivity: "base" });
    });

  const continentLabels: Record<ContinentKey, string> = {
    all: locale === "en" ? "All Regions" : locale === "zh-Hans" ? "全部地区" : "全部地區",
    asia: locale === "en" ? "Asia" : locale === "zh-Hans" ? "亚洲" : "亞洲",
    europe: locale === "en" ? "Europe" : locale === "zh-Hans" ? "欧洲" : "歐洲",
    "north-america": locale === "en" ? "North America" : locale === "zh-Hans" ? "北美洲" : "北美洲",
    "south-america": locale === "en" ? "South America" : locale === "zh-Hans" ? "南美洲" : "南美洲",
    africa: locale === "en" ? "Africa" : locale === "zh-Hans" ? "非洲" : "非洲",
    oceania: locale === "en" ? "Oceania" : locale === "zh-Hans" ? "大洋洲" : "大洋洲",
    other: locale === "en" ? "Other" : locale === "zh-Hans" ? "其他" : "其他",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t(locale, "airports.title")}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{t(locale, "airports.subtitle")}</p>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300">{t(locale, "airports.count", { count: filtered.length })}</div>
      </div>

      <AirportsSearch />

      <div className="flex flex-wrap gap-2">
        {(Object.keys(continentLabels) as ContinentKey[]).map((k) => (
          <Link
            key={k}
            href={k === "all" ? "/airports" : `/airports?continent=${encodeURIComponent(k)}`}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              continent === k
                ? "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
            ].join(" ")}
          >
            {continentLabels[k]}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => {
          const code = a.iata ?? a.icao ?? "";
          const region = [a.country, a.province, a.city].filter(Boolean).join(" / ");
          const badge =
            a.category || a.nature ? `${a.category ?? ""}${a.category && a.nature ? " · " : ""}${a.nature ?? ""}` : null;
          return (
            <Link
              key={`${a.iata ?? ""}-${a.icao ?? ""}-${a.nameZh}`}
              href={`/airports/${encodeURIComponent(code)}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{a.nameZh}</div>
                    <span className="rounded-lg border border-slate-200 bg-sky-50 px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-sky-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-sky-200">
                      {code}
                    </span>
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{a.nameEn}</div>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 ring-1 ring-slate-200 dark:ring-white/10">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {region ? (
                  <span className="rounded-lg border border-slate-200 bg-sky-50 px-2.5 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-200">
                    {region}
                  </span>
                ) : null}
                {badge ? (
                  <span className="rounded-lg border border-slate-200 bg-sky-50 px-2.5 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-200">
                    {badge}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 text-xs font-semibold text-sky-700 group-hover:text-sky-600 dark:text-sky-300 dark:group-hover:text-sky-200">
                {t(locale, "airports.view")}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

