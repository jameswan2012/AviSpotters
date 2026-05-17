import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { UserCreateForm } from "@/components/admin/UserCreateForm";

export default async function AdminUserCreatePage() {
  await requireSuperAdmin();
  const locale = await getServerLocaleOnly();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Create user" : locale === "zh-Hans" ? "创建用户" : "建立使用者"}
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Public registration is closed; only Super Admins can create accounts here."
              : locale === "zh-Hans"
                ? "公开注册已关闭，仅高级管理员可在此创建账号。"
                : "公開註冊已關閉，僅高級管理員可在此建立帳號。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/users"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {locale === "en" ? "Back" : locale === "zh-Hans" ? "返回" : "返回"}
          </Link>
        </div>
      </div>

      <UserCreateForm locale={locale} />
    </div>
  );
}

