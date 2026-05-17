import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { listIndexMerged } from "@/models/model-service";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminModelsPage() {
  const { roleId } = await requireAdmin();
  const locale = await getServerLocaleOnly();
  const canEdit = roleId >= 3;
  const items = await listIndexMerged({ includeHidden: true });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">
            {locale === "en" ? "Model Library (Admin Overrides)" : locale === "zh-Hans" ? "机型资料库（后台覆写）" : "機型資料庫（後台覆寫）"}
          </div>
          <div className="mt-2 text-sm text-slate-200">
            {canEdit
              ? locale === "en"
                ? "You can edit model data (saved to ModelOverride without changing base JSON)."
                : locale === "zh-Hans"
                  ? "你可以编辑机型信息（写入 ModelOverride，不会改动原始 JSON）。"
                  : "你可以編輯機型資訊（寫入 ModelOverride，不會改動原始 JSON）。"
              : locale === "en"
                ? "Read-only mode (reviewers cannot edit)."
                : locale === "zh-Hans"
                  ? "你当前仅可查看（审核员暂无编辑权限）。"
                  : "你目前僅能檢視（審核員暫無編輯權限）。"}
          </div>
        </div>
        <div className="text-xs text-slate-300">
          {locale === "en" ? `Indexed: ${items.length}` : locale === "zh-Hans" ? `当前索引：${items.length} 条` : `目前索引：${items.length} 筆`}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/admin/models/${encodeURIComponent(it.manufacturerId)}/${encodeURIComponent(it.familyId)}/${encodeURIComponent(
              it.modelId
            )}`}
            className="group rounded-2xl border border-white/10 bg-sky-950/30 p-4 hover:bg-sky-950/40"
          >
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-white">{it.name}</div>
              {it.hidden ? <span className="rounded-md border border-red-300/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-200">{locale === "en" ? "Hidden" : locale === "zh-Hans" ? "已隐藏" : "已隱藏"}</span> : null}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              {it.manufacturerId} / {it.familyId} / {it.modelId}
            </div>
            <div className="mt-3 text-xs font-semibold text-sky-300 group-hover:text-sky-200">
              {locale === "en" ? "Edit →" : locale === "zh-Hans" ? "进入编辑 →" : "進入編輯 →"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

