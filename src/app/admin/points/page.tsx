import { requireAdmin } from "@/lib/admin-guard";
import { PointsSystemAdmin } from "@/components/admin/PointsSystemAdmin";

export default async function AdminPointsPage() {
  const { roleId } = await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">積分與抽獎</h1>
        <p className="mt-2 text-sm text-slate-200">這裡可管理轉盤、獎品與抽獎方式。機率可直接填小數，例如 0.5。</p>
      </div>
      <PointsSystemAdmin canEdit={roleId >= 4} />
    </div>
  );
}
