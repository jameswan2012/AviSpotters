import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { StaffApplicationQuestionsAdmin } from "@/components/admin/StaffApplicationQuestionsAdmin";

export default async function AdminApplicationQuestionsPage() {
  await requireSuperAdmin();
  const locale = await getServerLocaleOnly();

  const questions = await prisma.staffApplicationQuestion.findMany({
    orderBy: [{ active: "desc" }, { order: "asc" }, { createdAt: "asc" }],
    select: { id: true, order: true, active: true, promptJson: true, imagePath: true, imageMime: true, imageSizeBytes: true, updatedAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Question bank" : locale === "zh-Hans" ? "题库管理" : "題庫管理"}
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Edit questions used in staff application."
              : locale === "zh-Hans"
                ? "管理入职申请使用的题目与图片。"
                : "管理入職申請使用的題目與圖片。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/applications" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
            {locale === "en" ? "Applications" : locale === "zh-Hans" ? "申请列表" : "申請列表"}
          </Link>
        </div>
      </div>

      <StaffApplicationQuestionsAdmin locale={locale} initialQuestions={questions} />
    </div>
  );
}

