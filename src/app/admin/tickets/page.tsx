import { requireAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { TicketsAdmin } from "@/components/admin/TicketsAdmin";
import { SYS_NOTIFY_PREFIX } from "@/lib/user-notifications";

export default async function AdminTicketsPage() {
  const { roleId } = await requireAdmin();
  const locale = await getServerLocaleOnly();
  const canEdit = roleId >= 3;

  const rows = await prisma.ticket.findMany({
    where: {
      AND: [
        { body: { not: { startsWith: SYS_NOTIFY_PREFIX } } },
        { body: { not: { startsWith: "[[MODERATION_INCIDENT]]" } } },
        { email: { notIn: ["system@avispotters.local", "__system_moderation__@local"] } },
      ],
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    select: { id: true, email: true, body: true, status: true, staffReply: true, resolvedAt: true, createdAt: true, updatedAt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Tickets" : locale === "zh-Hans" ? "工单" : "工單"}</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en"
            ? "Bug reports / feedback from users."
            : locale === "zh-Hans"
              ? "用户的 BUG 回报 / 反馈。"
              : "用戶的 BUG 回報 / 回饋。"}
        </p>
      </div>
      <TicketsAdmin locale={locale} canEdit={canEdit} initialRows={rows as any} />
    </div>
  );
}

