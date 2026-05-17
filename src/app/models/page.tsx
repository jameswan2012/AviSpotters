import Link from "next/link";
import { getServerLocaleOnly } from "@/i18n/server";
import { listManufacturers, buildModelPage } from "@/models/data";
import { listIndexMerged } from "@/models/model-service";

function norm(value: string) {
  return value.trim().toLowerCase();
}

export default async function ModelsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const q = String(sp.q || "").trim();
  const query = norm(q);
  const [manufacturers, index] = await Promise.all([Promise.resolve(listManufacturers()), listIndexMerged()]);

  const visibleIndex = index.filter((item) => !item.hidden);
  const filtered = query
    ? visibleIndex.filter((item) =>
        [item.name, item.modelId, item.familyId, item.manufacturerId, ...(item.keywords ?? [])]
          .join(" | ")
          .toLowerCase()
          .includes(query)
      )
    : visibleIndex;

  const grouped = manufacturers
    .map((manufacturer) => ({
      manufacturer,
      items: filtered.filter((item) => item.manufacturerId === manufacturer.id),
    }))
    .filter((group) => group.items.length > 0);

  function text(zhHant: string, zhHans: string, en: string) {
    return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{text("機型資料庫", "机型资料库", "Model library")}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {text("可按製造商、系列或型號快速查找機型資料。", "可按制造商、系列或型号快速查找机型资料。", "Browse aircraft models by manufacturer, family, or exact model.")}
            </p>
          </div>
          <Link href="/aircraft" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
            {text("飛機資料庫", "飞机数据库", "Aircraft database")}
          </Link>
        </div>

        <form className="mt-5 flex flex-col gap-3 sm:flex-row" action="/models" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder={text("搜尋 737-800 / A320neo / Boeing…", "搜索 737-800 / A320neo / Boeing…", "Search 737-800 / A320neo / Boeing…")}
            className="h-11 w-full flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/50 dark:text-slate-100"
          />
          <button type="submit" className="h-11 rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-sky-950 hover:bg-sky-400">
            {text("搜尋", "搜索", "Search")}
          </button>
        </form>
      </div>

      {grouped.map(({ manufacturer, items }) => (
        <section key={manufacturer.id} className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{manufacturer.name}</h2>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {[manufacturer.country, manufacturer.founded ? String(manufacturer.founded) : ""].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{items.length.toLocaleString()} models</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.slice(0, query ? items.length : 12).map((item) => (
              <Link
                key={item.slug}
                href={buildModelPage(item.manufacturerId, item.familyId, item.modelId)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100 dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/30"
              >
                <div className="text-base font-semibold text-slate-900 dark:text-white">{item.name}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {item.manufacturerId} / {item.familyId} / {item.modelId}
                </div>
                {item.summary ? (
                  <div className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.summary}</div>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ))}

      {!grouped.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {text("沒有符合條件的機型。", "没有符合条件的机型。", "No models matched the current query.")}
        </div>
      ) : null}
    </div>
  );
}
