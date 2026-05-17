import { requireStaff } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { AppealReviewTable } from "@/components/admin/AppealReviewTable";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminAppealsPage() {
  await requireStaff();
  const locale = await getServerLocaleOnly();

  const appeals = await prisma.appeal.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: {
      id: true,
      status: true,
      message: true,
      staffReply: true,
      createdAt: true,
      photo: { select: { id: true, registration: true, title: true, status: true, user: { select: { id: true, email: true, name: true } } } },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  const initialAppeals = appeals.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm text-slate-700 dark:text-slate-200">{locale === "en" ? "Appeals" : locale === "zh-Hans" ? "申诉" : "申訴"}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {(locale === "en" ? "Pending" : locale === "zh-Hans" ? "待处理" : "待處理")}: {initialAppeals.length}
        </div>
      </div>

      <AppealReviewTable initialAppeals={initialAppeals} />
    </div>
  );
}

