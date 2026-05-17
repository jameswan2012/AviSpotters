import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerLocaleOnly } from "@/i18n/server";
import { getModelMerged } from "@/models/model-service";

export default async function PublicModelDetailPage({
  params,
}: {
  params: Promise<{ manufacturer: string; family: string; model: string }>;
}) {
  const locale = await getServerLocaleOnly();
  const { manufacturer, family, model } = await params;
  const record = await getModelMerged(manufacturer, family, model);
  if (!record || record.hidden) notFound();

  function text(zhHant: string, zhHans: string, en: string) {
    return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {record.manufacturerId} / {record.familyId} / {record.modelId}
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{record.name}</h1>
            {record.summary ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{record.summary}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/models" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
              {text("返回機型庫", "返回机型库", "Back to models")}
            </Link>
            {record.wikiUrl ? (
              <a href={record.wikiUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
                Wikipedia
              </a>
            ) : null}
            {record.officialUrl ? (
              <a href={record.officialUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
                {text("官方頁面", "官方页面", "Official")}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={text("首飛", "首飞", "First flight")} value={record.firstFlight || "—"} />
        <Metric label={text("投入年份", "投入年份", "Introduced")} value={record.introduced ? String(record.introduced) : "—"} />
        <Metric label={text("航程", "航程", "Range")} value={record.rangeKm ? `${record.rangeKm.toLocaleString()} km` : "—"} />
        <Metric label={text("巡航速度", "巡航速度", "Cruise speed")} value={record.cruiseSpeedKmh ? `${record.cruiseSpeedKmh.toLocaleString()} km/h` : "—"} />
        <Metric label={text("典型座位", "典型座位", "Typical seats")} value={record.passengerCapacity?.typical ? String(record.passengerCapacity.typical) : "—"} />
        <Metric label={text("最大座位", "最大座位", "Max seats")} value={record.passengerCapacity?.max ? String(record.passengerCapacity.max) : "—"} />
        <Metric label={text("最大起飛重量", "最大起飞重量", "MTOW")} value={record.mtowKg ? `${record.mtowKg.toLocaleString()} kg` : "—"} />
        <Metric label={text("狀態", "状态", "Status")} value={record.productionStatus || "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          {record.images?.length ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{text("圖像", "图像", "Images")}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {record.images.map((src, index) => (
                  <div key={`${src}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${record.name}-${index + 1}`} className="h-56 w-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {record.layouts?.length ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{text("客艙布局", "客舱布局", "Cabin layouts")}</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {record.layouts.map((layout) => (
                  <div key={layout.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{layout.name}</div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {[layout.seats ? `${text("座位", "座位", "Seats")}: ${layout.seats}` : "", layout.rows ? `${text("排數", "排数", "Rows")}: ${layout.rows}` : ""]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                    {layout.seatmapUrl ? (
                      <a href={layout.seatmapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
                        {text("查看座位圖", "查看座位图", "Seat map")} →
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {record.manufacturersNotes ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{text("補充說明", "补充说明", "Notes")}</h2>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{record.manufacturersNotes}</div>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <ListSection title={text("發動機", "发动机", "Engines")} items={record.engines ?? []} empty={text("暫無資料", "暂无资料", "No data")} />
          <ListSection title={text("主要運營商", "主要运营商", "Major operators")} items={record.majorOperators ?? []} empty={text("暫無資料", "暂无资料", "No data")} />
          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{text("採購客戶", "采购客户", "Customers")}</h2>
            <div className="mt-4 space-y-3">
              {record.buyingCustomers?.length ? (
                record.buyingCustomers.map((customer, index) => (
                  <div key={`${customer.airline}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-white">{customer.airline}</span>
                    {typeof customer.orders === "number" ? ` · ${customer.orders}` : ""}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-600 dark:text-slate-300">{text("暫無資料", "暂无资料", "No data")}</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function ListSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
              {item}
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-300">{empty}</div>
        )}
      </div>
    </section>
  );
}
