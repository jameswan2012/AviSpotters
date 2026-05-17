import { requireStaff } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { ReportReviewTable } from "@/components/admin/ReportReviewTable";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminReportsPage() {
  await requireStaff();
  const locale = await getServerLocaleOnly();

  const reports = await prisma.correctionReport.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: 160,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      status: true,
      message: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  const initialReports = reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm text-slate-700 dark:text-slate-200">{locale === "en" ? "Reports" : locale === "zh-Hans" ? "举报" : "舉報"}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {(locale === "en" ? "Pending" : locale === "zh-Hans" ? "待处理" : "待處理")}: {initialReports.length}
        </div>
      </div>

      <ReportReviewTable initialReports={initialReports} />
    </div>
  );
}

