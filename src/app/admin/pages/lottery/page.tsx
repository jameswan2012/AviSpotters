import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { PageContentEditor } from "@/components/admin/PageContentEditor";

export default async function AdminLotteryContentPage() {
  const { roleId } = await requireAdmin();
  const canEdit = roleId >= 4;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">抽獎頁內容</h1>
          <p className="mt-2 text-sm text-slate-200">可編輯抽獎頁面標題下方的說明文字；留空就不顯示。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/points" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10">
            返回積分系統
          </Link>
          <Link href="/lottery" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
            前台預覽
          </Link>
        </div>
      </div>
      <PageContentEditor slug="lottery" canEdit={canEdit} />
    </div>
  );
}
