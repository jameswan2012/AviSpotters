import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminAirportsPage() {
  const { roleId } = await requireAdmin();
  const canEdit = roleId >= 3;
  const locale = await getServerLocaleOnly();

  const airports = await prisma.airport.findMany({
    orderBy: [{ country: "asc" }, { province: "asc" }, { city: "asc" }, { iata: "asc" }, { icao: "asc" }],
    select: { id: true, iata: true, icao: true, nameZh: true, nameEn: true, province: true, city: true, country: true, category: true, nature: true },
  });

  const title = locale === "en" ? "Airports" : locale === "zh-Hans" ? "机场资料" : "機場資料";
  const subtitle =
    locale === "en"
      ? "Reviewers can view; admins/super admins can create and edit."
      : locale === "zh-Hans"
        ? "审核员可查看；管理员/高级管理员可新增与编辑。"
        : "審核員可檢視；管理員/高級管理員可新增與編輯。";
  const totalLabel = locale === "en" ? "Total" : locale === "zh-Hans" ? "共" : "共";
  const totalUnit = locale === "en" ? "" : locale === "zh-Hans" ? "座" : "座";
  const addLabel = locale === "en" ? "Add airport" : locale === "zh-Hans" ? "新增机场" : "新增機場";
  const colCode = locale === "en" ? "Code" : locale === "zh-Hans" ? "代码" : "代碼";
  const colZh = locale === "en" ? "Chinese" : locale === "zh-Hans" ? "中文名" : "中文名";
  const colEn = locale === "en" ? "English" : locale === "zh-Hans" ? "英文名" : "英文名";
  const colRegion = locale === "en" ? "Region" : locale === "zh-Hans" ? "地区" : "地區";
  const colTags = locale === "en" ? "Tags" : locale === "zh-Hans" ? "标签" : "標籤";
  const colActions = locale === "en" ? "Actions" : locale === "zh-Hans" ? "操作" : "操作";
  const editLabel = locale === "en" ? "View / edit" : locale === "zh-Hans" ? "查看/编辑" : "檢視/編輯";
  const previewLabel = locale === "en" ? "Preview" : locale === "zh-Hans" ? "前台预览" : "前台預覽";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            {totalLabel} {airports.length} {totalUnit}
          </div>
          {canEdit ? (
            <Link href="/admin/airports/new" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
              {addLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-200">
            <tr>
              <th className="px-4 py-3">{colCode}</th>
              <th className="px-4 py-3">{colZh}</th>
              <th className="px-4 py-3">{colEn}</th>
              <th className="px-4 py-3">{colRegion}</th>
              <th className="px-4 py-3">{colTags}</th>
              <th className="px-4 py-3">{colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {airports.map((a) => {
              const code = a.iata ?? a.icao ?? "—";
              const region = [a.country, a.province, a.city].filter(Boolean).join(" / ");
              const badge =
                a.category || a.nature ? `${a.category ?? ""}${a.category && a.nature ? " · " : ""}${a.nature ?? ""}` : "—";
              return (
                <tr key={a.id} className="text-slate-900 dark:text-slate-100">
                  <td className="px-4 py-3 font-extrabold tracking-wider text-sky-700 dark:text-sky-200">{code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{a.nameZh}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{a.nameEn}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{region || "—"}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{badge}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/airports/${encodeURIComponent(a.id)}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-100 dark:hover:bg-sky-950/40"
                      >
                        {editLabel}
                      </Link>
                      {(a.iata ?? a.icao) ? (
                        <Link
                          href={`/airports/${encodeURIComponent((a.iata ?? a.icao) as string)}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                        >
                          {previewLabel}
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

