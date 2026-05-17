import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";
import { DeactivateForm } from "@/components/account/DeactivateForm";

export default async function DeactivateAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div className="ui-panel-strong flex flex-col gap-2 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t(locale, "account.deactivate.title")}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{t(locale, "account.deactivate.desc")}</p>
        </div>
        <Link href="/dashboard" className="ui-btn-muted">
          {t(locale, "account.deactivate.back")}
        </Link>
      </div>

      <DeactivateForm />

      <div className="text-xs text-slate-500 dark:text-slate-400">
        {t(locale, "account.deactivate.hint")}
      </div>
    </div>
  );
}

