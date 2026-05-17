import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AircraftDetailPage({ params }: { params: Promise<{ registration: string }> }) {
  const locale = await getServerLocaleOnly();
  const { registration } = await params;
  const reg = decodeURIComponent(registration).trim().toUpperCase();
  if (!reg) notFound();

  const row = await prisma.aircraftRegistration.findUnique({
    where: { registration: reg },
    select: { registration: true, aircraftModel: true, airline: true, msn: true, updatedAt: true },
  });
  if (!row) notFound();

  const photos = await prisma.photo.findMany({
    where: { status: "approved", registration: row.registration },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 24,
    select: { id: true, title: true, registration: true, aircraftModel: true, airline: true, shotAirport: true, shotAt: true, featured: true },
  });

  const title = locale === "en" ? "Aircraft" : locale === "zh-Hans" ? "飞机" : "飛機";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-slate-700 dark:text-slate-200">{title}</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{row.registration}</h1>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {(row.airline ?? "—") + " · " + (row.aircraftModel ?? "—") + " · MSN: " + (row.msn ?? "—")}
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            {locale === "en" ? "Updated" : locale === "zh-Hans" ? "更新" : "更新"}：{row.updatedAt.toISOString().slice(0, 10)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/aircraft" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
            {locale === "en" ? "Back" : locale === "zh-Hans" ? "返回" : "返回"}
          </Link>
          <Link href={`/photos?q=${encodeURIComponent(row.registration)}`} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
            {locale === "en" ? "Search photos" : locale === "zh-Hans" ? "搜索照片" : "搜尋照片"}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {locale === "en" ? "Linked photos" : locale === "zh-Hans" ? "关联照片" : "關聯照片"}
            </div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {locale === "en"
                ? "Approved photos in gallery with this registration."
                : locale === "zh-Hans"
                  ? "图库中该注册号的已通过照片。"
                  : "圖庫中此註冊號的已通過照片。"}
            </div>
          </div>
        </div>

        {photos.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <Link key={p.id} href={`/photos/${encodeURIComponent(p.id)}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=thumb`} alt={p.title ?? p.registration} className="h-44 w-full object-cover" />
                <div className="p-4">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.title ?? p.registration}</div>
                  <div className="mt-2 truncate text-xs text-slate-600 dark:text-slate-300">
                    {p.airline} · {p.aircraftModel} · {p.shotAirport}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{p.shotAt}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "No approved photos yet." : locale === "zh-Hans" ? "暂无已通过照片。" : "暫無已通過照片。"}
          </div>
        )}
      </div>
    </div>
  );
}

