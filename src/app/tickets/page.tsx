import { getServerLocaleOnly } from "@/i18n/server";
import { getCurrentUser } from "@/lib/current-user";
import { TicketForm } from "@/components/tickets/TicketForm";

export default async function TicketsPage() {
  const locale = await getServerLocaleOnly();
  const user = await getCurrentUser();
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="ui-panel-strong p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Tickets" : locale === "zh-Hans" ? "工单" : "工單"}</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en"
            ? "Report bugs or submit feedback."
            : locale === "zh-Hans"
              ? "反馈 BUG 或建议。"
              : "回報 BUG 或建議。"}
        </p>
      </div>
      <TicketForm locale={locale} initialEmail={user?.email ?? null} />
    </div>
  );
}

