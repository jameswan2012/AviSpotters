import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { getModelMerged } from "@/models/model-service";
import { ModelOverrideForm } from "@/components/admin/ModelOverrideForm";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminModelEditPage({
  params,
}: {
  params: Promise<{ manufacturer: string; family: string; model: string }>;
}) {
  const { roleId } = await requireAdmin();
  const locale = await getServerLocaleOnly();
  const { manufacturer, family, model } = await params;

  const base = await getModelMerged(manufacturer, family, model, { includeHidden: true });
  if (!base) return notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/models"
          className="inline-flex rounded-lg border border-white/10 bg-sky-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-sky-950/40"
        >
          {locale === "en" ? "← Back to models" : locale === "zh-Hans" ? "← 返回机型列表" : "← 回機型列表"}
        </Link>
        <Link
          href={`/models/${encodeURIComponent(manufacturer)}/${encodeURIComponent(family)}/${encodeURIComponent(model)}`}
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
          target="_blank"
        >
          {locale === "en" ? "Public preview →" : locale === "zh-Hans" ? "前台预览 →" : "前台預覽 →"}
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-slate-200">
          {locale === "en" ? "Edit model" : locale === "zh-Hans" ? "编辑机型" : "編輯機型"}
        </div>
        <div className="mt-2 text-2xl font-semibold text-white">
          {manufacturer} / {family} / {model}
        </div>
        {base.summary ? <div className="mt-3 text-sm text-slate-200">{base.summary}</div> : null}

        <div className="mt-6">
          <ModelOverrideForm
            manufacturerId={manufacturer}
            familyId={family}
            modelId={model}
            canEdit={roleId >= 3}
          />
        </div>
      </div>
    </div>
  );
}

