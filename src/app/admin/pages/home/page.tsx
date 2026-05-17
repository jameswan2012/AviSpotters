import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { PageContentEditor } from "@/components/admin/PageContentEditor";

export default async function AdminHomeContentPage() {
  const { roleId } = await requireAdmin();
  const canEdit = roleId >= 3;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">首頁內容</h1>
          <p className="mt-2 text-sm text-slate-200">這裡可覆寫首頁 Hero 與工具箱文案（依語系）。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10">
            返回後台
          </Link>
          <Link href="/" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
            前台預覽
          </Link>
        </div>
      </div>

      <PageContentEditor slug="home" canEdit={canEdit} />
    </div>
  );
}

