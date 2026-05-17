import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import Link from "next/link";
import { StaffApplyClient } from "@/components/dashboard/StaffApplyClient";

export default async function DashboardApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();

  // Screeners+ cannot apply.
  if (user.roleId >= 2) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "No permission" : locale === "zh-Hans" ? "无权限" : "無權限"}
          </div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Staff members cannot use the application system."
              : locale === "zh-Hans"
                ? "审核员及以上无法使用入职申请系统。"
                : "審核員及以上無法使用入職申請系統。"}
          </div>
          <div className="mt-4">
            <Link href="/dashboard" className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
              {locale === "en" ? "Back to dashboard" : locale === "zh-Hans" ? "返回 Dashboard" : "返回 Dashboard"} →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [approvedCount, app, questions] = await Promise.all([
    prisma.photo.count({ where: { userId: user.id, status: "approved" } }),
    prisma.staffApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, tracksJson: true, imagesJson: true, answersJson: true, submittedAt: true, createdAt: true, updatedAt: true },
    }),
    prisma.staffApplicationQuestion.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, order: true, promptJson: true, imagePath: true, imageMime: true, imageSizeBytes: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Staff application" : locale === "zh-Hans" ? "申请入职" : "申請入職"}
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Requirement: more than 100 approved photos."
              : locale === "zh-Hans"
                ? "门槛：已通过图片数需大于 100。"
                : "門檻：已通過圖片數需大於 100。"}
          </p>
        </div>
        <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
          {locale === "en" ? "Back" : locale === "zh-Hans" ? "返回" : "返回"}
        </Link>
      </div>

      <StaffApplyClient locale={locale} approvedCount={approvedCount} initialApplication={app} questions={questions} />
    </div>
  );
}

