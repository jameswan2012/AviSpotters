import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";
import { ProfileForm } from "@/components/account/ProfileForm";

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t(locale, "profile.pageTitle")}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{t(locale, "profile.pageDesc")}</p>
        </div>
        <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
          {t(locale, "account.deactivate.back")}
        </Link>
      </div>

      <ProfileForm />
    </div>
  );
}

