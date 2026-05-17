import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";

function asPositiveInt(v: string | null | undefined, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i > 0 ? i : fallback;
}

export default async function FeaturedPhotosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser();
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const page = asPositiveInt(sp.page ?? null, 1);
  const TAKE = 36;
  const skip = (page - 1) * TAKE;

  const where: any = { status: "approved", featured: true };
  const [total, photos] = await Promise.all([
    prisma.photo.count({ where }),
    prisma.photo.findMany({
      where,
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: TAKE,
      select: {
        id: true,
        title: true,
        registration: true,
        airline: true,
        aircraftModel: true,
        shotAirport: true,
        shotAt: true,
        _count: { select: { likes: true } },
        user: { select: { id: true, name: true, email: true, avatarUpdatedAt: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / TAKE));
  const safePage = Math.min(page, totalPages);

  function buildHref(nextPage: number) {
    const qp = new URLSearchParams();
    if (nextPage > 1) qp.set("page", String(nextPage));
    const qs = qp.toString();
    return qs ? `/photos/featured?${qs}` : "/photos/featured";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t(locale, "photos.featured")}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "Featured photos only." : locale === "zh-Hans" ? "仅展示精选作品。" : "僅展示精選作品。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/photos"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {locale === "en" ? "Normal gallery" : locale === "zh-Hans" ? "普通图库" : "普通圖庫"}
          </Link>
          {user ? (
            <Link href="/photos/upload" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
              {t(locale, "photos.upload")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p) => {
          const author = p.user.name ?? p.user.email;
          const avatarUrl = p.user.avatarUpdatedAt ? `/api/users/${encodeURIComponent(p.user.id)}/avatar?v=${p.user.avatarUpdatedAt.getTime()}` : null;
          return (
            <Link
              key={p.id}
              href={`/photos/${encodeURIComponent(p.id)}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=thumb`}
                alt={p.title ?? p.registration}
                className="h-48 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{p.title ?? p.registration}</div>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <span aria-hidden="true">♡</span>
                    <span>{p._count.likes}</span>
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  {p.airline} · {p.aircraftModel} · {p.shotAirport}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={author}
                        className="h-5 w-5 rounded-full border border-slate-200 object-cover dark:border-white/10"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-white text-[10px] font-extrabold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                        {(author || "U").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{author}</span>
                    <span>·</span>
                    <span>{p.shotAt}</span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-700 dark:text-slate-200">
          {locale === "en"
            ? `Page ${safePage} / ${totalPages}`
            : locale === "zh-Hans"
              ? `第 ${safePage} / ${totalPages} 页`
              : `第 ${safePage} / ${totalPages} 頁`}
        </div>
        <div className="flex gap-2">
          <Link
            href={buildHref(Math.max(1, safePage - 1))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {locale === "en" ? "Prev" : locale === "zh-Hans" ? "上一页" : "上一頁"}
          </Link>
          <Link
            href={buildHref(Math.min(totalPages, safePage + 1))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {locale === "en" ? "Next" : locale === "zh-Hans" ? "下一页" : "下一頁"}
          </Link>
        </div>
      </div>
    </div>
  );
}

