import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { LeaderboardsAdmin } from "@/components/admin/LeaderboardsAdmin";

export default async function AdminLeaderboardsPage() {
  const { roleId } = await requireSuperAdmin();
  const locale = await getServerLocaleOnly();
  const canEdit = roleId >= 4;

  const rows = await prisma.customLeaderboard.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      enabled: true,
      titleJson: true,
      descJson: true,
      metric: true,
      rangeKey: true,
      rangeStart: true,
      rangeEnd: true,
      participantsJson: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return (
    <LeaderboardsAdmin locale={locale} canEdit={canEdit} initialRows={rows as any} />
  );
}

