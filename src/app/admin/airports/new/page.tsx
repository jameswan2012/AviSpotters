import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { AirportEditorForm } from "@/components/admin/AirportEditorForm";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminAirportNewPage() {
  await requireAdmin();
  const locale = await getServerLocaleOnly();

  const title = locale === "en" ? "Add airport" : locale === "zh-Hans" ? "新增机场" : "新增機場";
  const subtitle =
    locale === "en"
      ? "After creating an airport, it will be available at /airports/[code]."
      : locale === "zh-Hans"
        ? "创建机场后即可在前台 `/airports/[code]` 显示介绍页。"
        : "建立機場後即可在前台 `/airports/[code]` 顯示介紹頁。";
  const backLabel = locale === "en" ? "Back" : locale === "zh-Hans" ? "返回列表" : "返回列表";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/airports"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {backLabel}
          </Link>
        </div>
      </div>

      <AirportEditorForm mode="new" canEdit={true} />
    </div>
  );
}

