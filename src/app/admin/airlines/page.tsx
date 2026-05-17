import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";
import { AirlineAdmin } from "@/components/admin/AirlineAdmin";

export default async function AdminAirlinesPage() {
  const { roleId } = await requireAdmin();
  const locale = await getServerLocaleOnly();
  const canEdit = roleId >= 3;

  const rows = await prisma.airline.findMany({ orderBy: [{ updatedAt: "desc" }] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Airlines" : locale === "zh-Hans" ? "航空公司" : "航空公司"}</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en"
            ? "Add multiple keywords/aliases for search (IATA/ICAO/Chinese/English/custom)."
            : locale === "zh-Hans"
              ? "可添加多个关键词/别名用于搜索（IATA/ICAO/中英文/自定义）。"
              : "可添加多個關鍵字/別名用於搜尋（IATA/ICAO/中英文/自訂）。"}
        </p>
      </div>

      <AirlineAdmin initialRows={rows} canEdit={canEdit} locale={locale} />
    </div>
  );
}

