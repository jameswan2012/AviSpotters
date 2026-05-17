import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { ReactNode } from "react";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";
import { getCurrentUser } from "@/lib/current-user";

function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

type TerminalInfo = { name: string; areaWanSqm?: number; notes?: string };
type RunwayInfo = { ident: string; lengthM?: number; widthM?: number; surface?: string; notes?: string };
type Fact = { label: string; value: string };

export default async function AirportDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const locale = await getServerLocaleOnly();
  const user = await getCurrentUser();
  const codeUpper = decodeURIComponent(code).trim().toUpperCase();

  const airport = await prisma.airport.findFirst({
    where: {
      OR: [{ iata: codeUpper }, { icao: codeUpper }],
    },
  });

  if (!airport) notFound();

  const terminals = safeJson<TerminalInfo[]>(airport.terminalsJson, []);
  const runways = safeJson<RunwayInfo[]>(airport.runwaysJson, []);
  const airlines = safeJson<string[]>(airport.airlinesJson, []);
  const traffic = safeJson<Record<string, unknown> | null>(airport.trafficJson, null);
  const facts = safeJson<Fact[]>(airport.factsJson, []);
  const photos = safeJson<string[]>(airport.photosJson, []);
  const taxiwayPhotos = safeJson<string[]>(airport.taxiwayPhotosJson, []);

  const region = [airport.country, airport.province, airport.city].filter(Boolean).join(" / ");
  const titleCode = airport.iata ?? airport.icao ?? codeUpper;

  const terminalCount = terminals.length || null;
  const terminalAreaTotalWan = terminals.reduce((sum, t) => sum + (typeof t.areaWanSqm === "number" ? t.areaWanSqm : 0), 0);
  const runwayCount = runways.length || null;
  const runwayLengths = runways
    .map((r) => (typeof r.lengthM === "number" ? r.lengthM : null))
    .filter((x): x is number => typeof x === "number");
  const zh = locale === "zh-Hans";
  const terminalLabel = locale === "en" ? "Terminals" : zh ? "航站楼数量" : "航站樓數量";
  const sizeLabel = locale === "en" ? "Size" : zh ? "面积" : "大小";
  const commercialLabel = locale === "en" ? "Commercial flights" : zh ? "商业航班量" : "商業航班量";
  const airlinesLabel = locale === "en" ? "Airlines" : zh ? "航空公司" : "航空公司";
  const runwayCountLabel = locale === "en" ? "Runway count" : zh ? "跑道数量" : "跑道數量";
  const runwayLenLabel = locale === "en" ? "Runway length" : zh ? "跑道长度" : "跑道長度";
  const runwayInfoLabel = locale === "en" ? "Runway info" : zh ? "跑道信息" : "跑道資訊";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{airport.nameZh}</h1>
            <span className="rounded-lg border border-slate-200 bg-sky-50 px-2.5 py-1 text-xs font-extrabold tracking-wider text-sky-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-sky-200">
              {titleCode}
            </span>
            {airport.category ? (
              <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                {airport.category}
              </span>
            ) : null}
            {airport.nature ? (
              <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                {airport.nature}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{airport.nameEn}</p>
          {region ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{region}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/airports"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {t(locale, "airports.back")}
          </Link>
          {user ? (
            <Link
              href={`/reports/new?type=airport&id=${encodeURIComponent(airport.id)}`}
              className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/15"
            >
              {locale === "en" ? "Report info" : locale === "zh-Hans" ? "举报信息" : "舉報資訊"}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 lg:col-span-2">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(locale, "airports.info")}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="IATA" value={airport.iata ?? "—"} />
            <InfoRow label="ICAO" value={airport.icao ?? "—"} />
            <InfoRow label={locale === "en" ? "Opened on" : zh ? "启用日期" : "啟用日期"} value={airport.openedOn ?? "—"} />
            <InfoRow label={locale === "en" ? "Served city" : zh ? "主要服务城市" : "主服務城市"} value={airport.city ?? "—"} />
            <InfoRow label={locale === "en" ? "Elevation" : zh ? "标高" : "標高"} value={typeof airport.elevationM === "number" ? `${airport.elevationM} m` : "—"} />
            <InfoRow label={locale === "en" ? "Timezone" : zh ? "时区" : "時區"} value={airport.timezone ?? "—"} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(locale, "airports.summary")}</div>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <li>
              - {terminalLabel}：<span className="font-semibold text-slate-900 dark:text-white">{terminalCount ?? "—"}</span>
            </li>
            <li>
              - {sizeLabel}：<span className="font-semibold text-slate-900 dark:text-white">{terminalAreaTotalWan ? `${terminalAreaTotalWan.toFixed(1)} ${locale === "en" ? "10k m²" : zh ? "万㎡" : "萬㎡"}` : "—"}</span>
            </li>
            <li>
              - {commercialLabel}：<span className="font-semibold text-slate-900 dark:text-white">{traffic?.commercialFlights ? String(traffic.commercialFlights) : "—"}</span>
            </li>
            <li>
              - {airlinesLabel}：<span className="font-semibold text-slate-900 dark:text-white">{airlines.length ? `${airlines.slice(0, 6).join("、")}${airlines.length > 6 ? "…" : ""}` : "—"}</span>
            </li>
            <li>
              - {runwayCountLabel}：<span className="font-semibold text-slate-900 dark:text-white">{runwayCount ?? "—"}</span>
            </li>
            <li>
              - {runwayLenLabel}：<span className="font-semibold text-slate-900 dark:text-white">{runwayLengths.length ? `${Math.max(...runwayLengths)} m${locale === "en" ? " (max)" : zh ? "（最长）" : "（最長）"}` : "—"}</span>
            </li>
            <li>
              - {runwayInfoLabel}：<span className="font-semibold text-slate-900 dark:text-white">{runways.length ? `${runways[0].ident}${runways.length > 1 ? "…" : ""}` : "—"}</span>
            </li>
          </ul>
        </div>
      </div>

      {airport.intro ? (
        <SectionCard title={t(locale, "airports.intro")}>
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{airport.intro}</div>
        </SectionCard>
      ) : null}

      {facts.length ? (
        <SectionCard title={t(locale, "airports.more")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {facts.slice(0, 12).map((f, idx) => (
              <InfoRow key={`${f.label}-${idx}`} label={f.label} value={f.value} />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t(locale, "airports.terminals")}>
          {terminals.length ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-xs text-slate-200">
                  <tr>
                    <th className="px-3 py-2">{locale === "en" ? "Terminal" : zh ? "航站楼" : "航站樓"}</th>
                    <th className="px-3 py-2">{locale === "en" ? "Area (10k m²)" : zh ? "面积（万㎡）" : "面積（萬㎡）"}</th>
                    <th className="px-3 py-2">{locale === "en" ? "Notes" : zh ? "备注" : "備註"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {terminals.map((t) => (
                    <tr key={t.name} className="text-slate-100">
                      <td className="px-3 py-2 font-semibold text-white">{t.name}</td>
                      <td className="px-3 py-2">{typeof t.areaWanSqm === "number" ? t.areaWanSqm.toFixed(1) : "—"}</td>
                      <td className="px-3 py-2 text-slate-200">{t.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyHint text={locale === "en" ? "No terminal info yet (can be added in admin)." : zh ? "尚未填写航站楼信息（可在后台补充）。" : "尚未填寫航站樓資訊（可由後台補齊）。"} />
          )}
        </SectionCard>

        <SectionCard title={t(locale, "airports.runways")}>
          {runways.length ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-xs text-slate-200">
                  <tr>
                    <th className="px-3 py-2">{locale === "en" ? "Runway" : zh ? "跑道" : "跑道"}</th>
                    <th className="px-3 py-2">{locale === "en" ? "Size" : zh ? "尺寸" : "尺寸"}</th>
                    <th className="px-3 py-2">{locale === "en" ? "Surface" : zh ? "铺面" : "鋪面"}</th>
                    <th className="px-3 py-2">{locale === "en" ? "Notes" : zh ? "备注" : "備註"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {runways.map((r) => (
                    <tr key={r.ident} className="text-slate-100">
                      <td className="px-3 py-2 font-semibold text-white">{r.ident}</td>
                      <td className="px-3 py-2">
                        {typeof r.lengthM === "number" ? `${r.lengthM}` : "—"}×{typeof r.widthM === "number" ? `${r.widthM}` : "—"} m
                      </td>
                      <td className="px-3 py-2">{r.surface ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-200">{r.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyHint text={locale === "en" ? "No runway info yet (can be added in admin)." : zh ? "尚未填写跑道信息（可在后台补充）。" : "尚未填寫跑道資訊（可由後台補齊）。"} />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t(locale, "airports.photos")}>
          {photos.length ? (
            <UrlList urls={photos} />
          ) : (
            <EmptyHint text={locale === "en" ? "Reserved field: airport photo URLs can be added in admin." : zh ? "已预留：可存放机场照片 URL（后台可新增）。" : "已預留：可存放機場照片 URL（後台可新增）。"} />
          )}
        </SectionCard>
        <SectionCard title={t(locale, "airports.taxiwayPhotos")}>
          {taxiwayPhotos.length ? (
            <UrlList urls={taxiwayPhotos} />
          ) : (
            <EmptyHint text={locale === "en" ? "Reserved field: taxiway/runway photo URLs can be added in admin." : zh ? "已预留：可存放滑行道/跑道图片 URL（后台可新增）。" : "已預留：可存放滑行道/跑道圖片 URL（後台可新增）。"} />
          )}
        </SectionCard>
      </div>

      {airport.notes ? (
        <SectionCard title={t(locale, "airports.notes")}>
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{airport.notes}</div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-sky-50 px-3 py-2.5 dark:border-white/10 dark:bg-sky-950/30">
      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-sky-50 p-4 text-sm text-slate-700 dark:border-white/15 dark:bg-sky-950/20 dark:text-slate-200">
      {text}
    </div>
  );
}

function UrlList({ urls }: { urls: string[] }) {
  return (
    <div className="space-y-2">
      {urls.map((u) => (
        <a
          key={u}
          href={u}
          target="_blank"
          rel="noreferrer"
          className="block truncate rounded-xl border border-white/10 bg-sky-950/30 px-3 py-2 text-sm text-sky-200 hover:bg-sky-950/40"
        >
          {u}
        </a>
      ))}
    </div>
  );
}

