import { requireSuperAdmin } from "@/lib/admin-guard";
import { IpBanAdmin } from "@/components/admin/IpBanAdmin";
import { UnifiedBanAdmin } from "@/components/admin/UnifiedBanAdmin";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminBansPage() {
  await requireSuperAdmin();
  const locale = await getServerLocaleOnly();
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm text-slate-700 dark:text-slate-200">
          {locale === "en" ? "Bans" : locale === "zh-Hans" ? "封禁管理" : "封禁管理"}
        </div>
        <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {locale === "en"
            ? 'Account bans are managed in "User details". This page manages IP bans.'
            : locale === "zh-Hans"
              ? "账号封禁在「用户详情页」；此页管理 IP 封禁。"
              : "帳號封禁在「使用者詳頁」；此頁管理 IP 封禁"}
        </div>
      </div>
      <UnifiedBanAdmin />
      <IpBanAdmin />
    </div>
  );
}

