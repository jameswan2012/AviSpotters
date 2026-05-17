import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export default async function AdminApplicationsPage() {
  await requireSuperAdmin();
  const locale = await getServerLocaleOnly();

  const apps = await prisma.staffApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      status: true,
      tracksJson: true,
      submittedAt: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true, roleId: true } },
    },
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Staff applications" : locale === "zh-Hans" ? "入职申请" : "入職申請"}
          </div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en"
              ? "Latest 200 submissions."
              : locale === "zh-Hans"
                ? "最近 200 条申请。"
                : "最近 200 筆申請。"}
          </div>
        </div>
        <Link href="/admin/applications/questions" className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
          {locale === "en" ? "Question bank →" : locale === "zh-Hans" ? "题库管理 →" : "題庫管理 →"}
        </Link>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2">{locale === "en" ? "Applicant" : locale === "zh-Hans" ? "申请人" : "申請人"}</th>
              <th className="px-3 py-2">{locale === "en" ? "Tracks" : locale === "zh-Hans" ? "轨道" : "軌道"}</th>
              <th className="px-3 py-2">{locale === "en" ? "Status" : locale === "zh-Hans" ? "状态" : "狀態"}</th>
              <th className="px-3 py-2">{locale === "en" ? "Created" : locale === "zh-Hans" ? "创建" : "建立"}</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => {
              const tracks = safeParse<string[]>(a.tracksJson, []);
              const name = a.user.name ?? a.user.email;
              return (
                <tr key={a.id} className="border-t border-slate-200 dark:border-white/10">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{name}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{a.user.email}</div>
                    <div className="mt-2">
                      <Link href={`/admin/applications/${encodeURIComponent(a.id)}`} className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300">
                        {locale === "en" ? "View →" : locale === "zh-Hans" ? "查看 →" : "查看 →"}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{tracks.join(", ") || "—"}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{a.status}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{a.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

