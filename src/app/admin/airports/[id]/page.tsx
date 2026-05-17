import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { AirportEditorForm } from "@/components/admin/AirportEditorForm";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminAirportEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { roleId } = await requireAdmin();
  const locale = await getServerLocaleOnly();
  const { id } = await params;
  const canEdit = roleId >= 3;

  const airport = await prisma.airport.findUnique({
    where: { id },
    select: { id: true, iata: true, icao: true, nameZh: true },
  });
  if (!airport) notFound();

  const code = airport.iata ?? airport.icao;
  const title = locale === "en" ? "Edit airport" : locale === "zh-Hans" ? "编辑机场" : "機場編輯";
  const backLabel = locale === "en" ? "Back" : locale === "zh-Hans" ? "返回列表" : "返回列表";
  const previewLabel = locale === "en" ? "Preview" : locale === "zh-Hans" ? "前台预览" : "前台預覽";
  const noCode = locale === "en" ? "No code" : locale === "zh-Hans" ? "无代码" : "無代碼";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {airport.nameZh}（{code ?? noCode}）
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/airports"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {backLabel}
          </Link>
          {code ? (
            <Link href={`/airports/${encodeURIComponent(code)}`} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
              {previewLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <AirportEditorForm mode="edit" airportId={airport.id} canEdit={canEdit} />
    </div>
  );
}

