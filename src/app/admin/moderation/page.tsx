import { requireAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { ModerationAdmin } from "@/components/admin/ModerationAdmin";

export default async function AdminModerationPage() {
  await requireAdmin();
  const locale = await getServerLocaleOnly();
  const title = locale === "en" ? "Content moderation" : locale === "zh-Hans" ? "内容风控" : "內容風控";
  const subtitle =
    locale === "en"
      ? "Manage low/high sensitive word libraries and review incidents."
      : locale === "zh-Hans"
        ? "管理低/高敏感词库并审核违规事件。"
        : "管理低/高敏感詞庫並審核違規事件。";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{subtitle}</p>
      </div>
      <ModerationAdmin />
    </div>
  );
}

