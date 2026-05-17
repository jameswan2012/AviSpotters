import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { PhotoUploadForm } from "@/components/photos/PhotoUploadForm";

export default async function PhotoUploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [occupied, profile] = await Promise.all([
    prisma.photo.count({ where: { userId: user.id, status: "pending" } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { uploadDisabled: true, priorityPasses: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">照片上傳</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">填寫基本資訊後提交照片，作品會先進入待審佇列，再由審核員處理。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gallery"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            返回圖庫
          </Link>
        </div>
      </div>

      {profile?.uploadDisabled ? (
        <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-700 dark:text-red-100">
          你的上傳功能目前已被停用。如需恢復，請聯絡管理員。
        </div>
      ) : (
        <PhotoUploadForm occupied={occupied} queueLimit={5} priorityPasses={profile?.priorityPasses ?? 0} />
      )}
    </div>
  );
}
