import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getServerLocaleOnly();
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      featured: true,
      title: true,
      registration: true,
      aircraftModel: true,
      airline: true,
      shotAirport: true,
      shotAt: true,
      msn: true,
      description: true,
      reviewedAt: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!photo || photo.status !== "approved") notFound();

  const author = photo.user.name ?? photo.user.email;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">
              {photo.title ?? `${photo.registration}｜${photo.aircraftModel}`}
            </h1>
            {photo.featured ? (
              <span className="rounded-lg bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30 dark:text-amber-200">
                {t(locale, "gallery.featured")}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {photo.shotAirport} · {photo.shotAt} · {author}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gallery"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {t(locale, "gallery.back")}
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="bg-slate-100 dark:bg-sky-950/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/photos/file/${encodeURIComponent(photo.id)}?variant=display`}
            alt={photo.title ?? photo.registration}
            className="h-auto w-full"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5 lg:col-span-2">
          <div className="text-sm font-semibold text-slate-950 dark:text-white">{t(locale, "gallery.detail.info")}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label={t(locale, "gallery.detail.registration")} value={photo.registration} />
            <Info label={t(locale, "gallery.detail.shotAirport")} value={photo.shotAirport} />
            <Info label={t(locale, "gallery.detail.model")} value={photo.aircraftModel} />
            <Info label={t(locale, "gallery.detail.airline")} value={photo.airline} />
            <Info label={t(locale, "gallery.detail.shotAt")} value={photo.shotAt} />
            <Info label={t(locale, "gallery.detail.msn")} value={photo.msn ?? "—"} />
            <Info label={t(locale, "gallery.detail.approvedAt")} value={photo.reviewedAt ? photo.reviewedAt.toISOString().slice(0, 10) : "—"} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-slate-950 dark:text-white">{t(locale, "gallery.detail.description")}</div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
            {photo.description ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-sky-950/30">
      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

