import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { AppealCreateForm } from "@/components/appeals/AppealCreateForm";

export default async function AppealNewPage({ searchParams }: { searchParams: Promise<{ photoId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const photoId = (sp.photoId ?? "").trim();
  if (!photoId) redirect("/photos/mine?status=rejected");

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, userId: true, status: true, title: true, registration: true },
  });
  if (!photo || photo.userId !== user.id) redirect("/photos/mine");
  if (photo.status !== "rejected") redirect(`/photos/${encodeURIComponent(photo.id)}`);

  const openAppeal = await prisma.appeal.findFirst({ where: { photoId: photo.id, userId: user.id, status: "open" }, select: { id: true } });
  if (openAppeal) redirect("/appeals");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Appeal" : locale === "zh-Hans" ? "申诉" : "申訴"}</h1>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "Photo" : locale === "zh-Hans" ? "作品" : "作品"}：{photo.title ?? photo.registration}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/photos/${encodeURIComponent(photo.id)}`} className="ui-btn-muted">
            {locale === "en" ? "Back" : locale === "zh-Hans" ? "返回" : "返回"}
          </Link>
          <Link href="/appeals" className="ui-btn-muted">
            {locale === "en" ? "My appeals" : locale === "zh-Hans" ? "我的申诉" : "我的申訴"}
          </Link>
        </div>
      </div>

      <AppealCreateForm photoId={photo.id} />
    </div>
  );
}

