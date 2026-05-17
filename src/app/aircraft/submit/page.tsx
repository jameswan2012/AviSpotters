import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";
import { AircraftSubmissionForm } from "@/components/aircraft/AircraftSubmissionForm";

export default async function AircraftSubmitPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.roleId < 1) redirect("/dashboard");
  const locale = await getServerLocaleOnly();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Submit aircraft info" : locale === "zh-Hans" ? "提交飞机信息" : "提交飛機資訊"}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Your submission will be reviewed by staff before it becomes available for auto-fill."
              : locale === "zh-Hans"
                ? "你提交的信息需要经过审核员以上审核通过后才会进入自动填充数据库。"
                : "你提交的資訊需要經審核員以上審核通過後，才會進入自動填充資料庫。"}
          </p>
        </div>
        <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
          {t(locale, "account.deactivate.back")}
        </Link>
      </div>

      <AircraftSubmissionForm />
    </div>
  );
}

