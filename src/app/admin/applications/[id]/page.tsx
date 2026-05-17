import Link from "next/link";
import { notFound } from "next/navigation";
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

export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const locale = await getServerLocaleOnly();
  const { id } = await params;

  const app = await prisma.staffApplication.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      tracksJson: true,
      imagesJson: true,
      answersJson: true,
      createdAt: true,
      submittedAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!app) return notFound();

  const tracks = safeParse<string[]>(app.tracksJson, []);
  const images = safeParse<{ name?: string; path: string; mime: string; sizeBytes: number }[]>(app.imagesJson, []);
  const answers = safeParse<{ questionId: string; answer: string }[]>(app.answersJson, []);

  const qs = await prisma.staffApplicationQuestion.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, order: true, promptJson: true },
  });
  const promptById = new Map<string, string>();
  for (const q of qs) {
    const obj = safeParse<{ zhHant?: string; zhHans?: string; en?: string }>(q.promptJson, {});
    const prompt = locale === "en" ? obj.en ?? obj.zhHant ?? obj.zhHans ?? "" : locale === "zh-Hans" ? obj.zhHans ?? obj.zhHant ?? obj.en ?? "" : obj.zhHant ?? obj.zhHans ?? obj.en ?? "";
    promptById.set(q.id, String(prompt || "").trim());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {locale === "en" ? "Application" : locale === "zh-Hans" ? "申请" : "申請"} #{app.id}
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {app.user.name ?? app.user.email} · {app.user.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/applications" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
            {locale === "en" ? "Back" : locale === "zh-Hans" ? "返回" : "返回"}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Meta" : locale === "zh-Hans" ? "信息" : "資訊"}</div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-700 dark:text-slate-200">status</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">{app.status}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-700 dark:text-slate-200">{locale === "en" ? "Tracks" : locale === "zh-Hans" ? "轨道" : "軌道"}</dt>
              <dd className="text-slate-900 dark:text-slate-100">{tracks.join(", ") || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-700 dark:text-slate-200">{locale === "en" ? "Submitted" : locale === "zh-Hans" ? "提交时间" : "提交時間"}</dt>
              <dd className="text-slate-900 dark:text-slate-100">{app.submittedAt ? app.submittedAt.toISOString().slice(0, 19).replace("T", " ") : "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Images" : locale === "zh-Hans" ? "图片" : "圖片"}</div>
          <div className="mt-4 space-y-3">
            {images.length ? (
              images.map((im) => {
                const name = im.path.split("/").slice(-1)[0];
                const url = `/api/staff-application/applications/${encodeURIComponent(app.id)}/files/${encodeURIComponent(name)}`;
                return (
                  <div key={im.path} className="rounded-xl border border-slate-200 bg-sky-50 p-3 text-sm dark:border-white/10 dark:bg-sky-950/30">
                    <div className="font-semibold text-slate-900 dark:text-white">{im.name || name}</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={im.name || name} className="mt-2 max-h-64 w-full rounded-xl object-contain" />
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-slate-700 dark:text-slate-200">{locale === "en" ? "No images." : locale === "zh-Hans" ? "暂无图片。" : "暫無圖片。"}</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Answers" : locale === "zh-Hans" ? "回答" : "回答"}</div>
        <div className="mt-4 space-y-3">
          {answers.length ? (
            answers.map((a, idx) => (
              <div key={a.questionId + idx} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {idx + 1}. {promptById.get(a.questionId) || a.questionId}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{a.answer || "—"}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-700 dark:text-slate-200">{locale === "en" ? "No answers." : locale === "zh-Hans" ? "暂无回答。" : "暫無回答。"}</div>
          )}
        </div>
      </div>
    </div>
  );
}

