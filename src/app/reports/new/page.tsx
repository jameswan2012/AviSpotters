import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { ReportCreateForm } from "@/components/reports/ReportCreateForm";

export default async function ReportNewPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const type = (sp.type ?? "").trim();
  const id = (sp.id ?? "").trim();

  if (!type || !id) redirect("/reports");
  if (type !== "photo" && type !== "airport") redirect("/reports");

  if (type === "photo") {
    const photo = await prisma.photo.findUnique({ where: { id }, select: { id: true, title: true, registration: true } });
    if (!photo) redirect("/reports");
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Report" : locale === "zh-Hans" ? "举报" : "舉報"}</h1>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {locale === "en" ? "Target" : locale === "zh-Hans" ? "对象" : "對象"}：{photo.title ?? photo.registration}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/photos/${encodeURIComponent(photo.id)}`} className="ui-btn-muted">
              {locale === "en" ? "Back" : locale === "zh-Hans" ? "返回" : "返回"}
            </Link>
            <Link href="/reports" className="ui-btn-muted">
              {locale === "en" ? "My reports" : locale === "zh-Hans" ? "我的举报" : "我的舉報"}
            </Link>
          </div>
        </div>
        <ReportCreateForm targetType="photo" targetId={photo.id} />
      </div>
    );
  }

  const airport = await prisma.airport.findUnique({ where: { id }, select: { id: true, iata: true, icao: true, nameZh: true, nameEn: true } });
  if (!airport) redirect("/reports");
  const label = locale === "en" ? airport.nameEn : airport.nameZh;
  const code = airport.iata ?? airport.icao ?? airport.id;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Report" : locale === "zh-Hans" ? "举报" : "舉報"}</h1>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "Target" : locale === "zh-Hans" ? "对象" : "對象"}：{code} · {label}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/airports" className="ui-btn-muted">
            {locale === "en" ? "Airports" : locale === "zh-Hans" ? "机场" : "機場"}
          </Link>
          <Link href="/reports" className="ui-btn-muted">
            {locale === "en" ? "My reports" : locale === "zh-Hans" ? "我的举报" : "我的舉報"}
          </Link>
        </div>
      </div>
      <ReportCreateForm targetType="airport" targetId={airport.id} />
    </div>
  );
}

