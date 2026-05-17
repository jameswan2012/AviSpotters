import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { InboxThread } from "@/components/admin/InboxThread";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminInboxThreadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const locale = await getServerLocaleOnly();
  const { id } = await params;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/inbox"
        className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-100 dark:hover:bg-sky-950/40"
      >
        ← {locale === "en" ? "Back to inbox" : locale === "zh-Hans" ? "返回收件箱" : "回收件匣"}
      </Link>
      <InboxThread conversationId={id} />
    </div>
  );
}

