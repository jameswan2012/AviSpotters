import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function AdminInboxPage() {
  const { user, roleId } = await requireSuperAdmin();
  const locale = await getServerLocaleOnly();

  const conversations = await prisma.conversation.findMany({
    where: {
      status: "open",
      ...(roleId >= 4 ? {} : { OR: [{ assignedStaffId: null }, { assignedStaffId: user.id }] }),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      updatedAt: true,
      user: { select: { email: true, name: true } },
      assignedStaffId: true,
      assignedStaff: { select: { email: true, name: true } },
    },
    take: 200,
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Inbox" : locale === "zh-Hans" ? "收件箱" : "收件匣"}
          </div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {roleId >= 3
              ? locale === "en"
                ? "You can open a thread and reply."
                : locale === "zh-Hans"
                  ? "你可以进入对话并回复。"
                  : "你可以進入對話並回覆。"
              : locale === "en"
                ? "Read-only (reviewers cannot reply)."
                : locale === "zh-Hans"
                  ? "你目前仅能查看收件箱（审核员无回复权限）。"
                  : "你目前僅能檢視收件匣（審核員無回覆權限）。"}
          </div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300">
          {locale === "en" ? "Open" : locale === "zh-Hans" ? "未结案" : "未結案"}：{conversations.length}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {conversations.length ? (
          conversations.map((c) => (
            <Link
              key={c.id}
              href={`/admin/inbox/${c.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-sky-50 px-4 py-3 hover:bg-sky-100 dark:border-white/10 dark:bg-sky-950/30 dark:hover:bg-sky-950/40"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {c.user.name ? `${c.user.name}（${c.user.email}）` : c.user.email}
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {locale === "en" ? "Updated" : locale === "zh-Hans" ? "更新" : "更新"}：{c.updatedAt.toISOString().slice(0, 19).replace("T", " ")}
                </div>
                {roleId >= 4 && c.assignedStaffId ? (
                  <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {locale === "en"
                      ? `Assigned: ${c.assignedStaff?.name ?? c.assignedStaff?.email ?? c.assignedStaffId}`
                      : locale === "zh-Hans"
                        ? `已指派：${c.assignedStaff?.name ?? c.assignedStaff?.email ?? c.assignedStaffId}`
                        : `已指派：${c.assignedStaff?.name ?? c.assignedStaff?.email ?? c.assignedStaffId}`}
                  </div>
                ) : null}
              </div>
              <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                {locale === "en" ? "Open →" : locale === "zh-Hans" ? "打开 →" : "開啟 →"}
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-sky-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-200">
            {locale === "en" ? "No open threads." : locale === "zh-Hans" ? "目前没有未结案对话。" : "目前沒有未結案對話。"}
          </div>
        )}
      </div>
    </div>
  );
}

