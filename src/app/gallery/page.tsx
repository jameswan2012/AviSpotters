import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { t } from "@/i18n/t";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; featured?: string }>;
}) {
  const { q, cat, featured } = await searchParams;
  const query = (q ?? "").trim();
  const category = (cat ?? "").trim();
  const featuredOnly = (featured ?? "").trim() === "1";
  const locale = await getServerLocaleOnly();

  const where: any = {
    status: "approved",
    ...(featuredOnly ? { featured: true } : {}),
    ...(category ? { categoriesJson: { contains: `"${category}"` } } : {}),
    ...(query
      ? {
          OR: [
            { registration: { contains: query } },
            { shotAirport: { contains: query } },
            { aircraftModel: { contains: query } },
            { airline: { contains: query } },
            { title: { contains: query } },
            { description: { contains: query } },
            { msn: { contains: query } },
          ],
        }
      : {}),
  };

  const photos = await prisma.photo.findMany({
    where,
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    take: 48,
    select: {
      id: true,
      title: true,
      registration: true,
      aircraftModel: true,
      airline: true,
      shotAirport: true,
      shotAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="ui-panel-strong p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{t(locale, "gallery.title")}</h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{t(locale, "gallery.desc")}</p>
          </div>
          <Link href="/upload" className="ui-btn-primary inline-flex">
            {t(locale, "gallery.upload")}
          </Link>
        </div>

        {(category || featuredOnly) ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {category ? (
              <span className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-700 dark:text-sky-200">
                {locale === "en" ? "Category" : locale === "zh-Hans" ? "分类" : "分類"}: {category}
              </span>
            ) : null}
            {featuredOnly ? (
              <span className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-200">
                {locale === "en" ? "Featured only" : locale === "zh-Hans" ? "仅精选" : "僅精選"}
              </span>
            ) : null}
            <Link href="/gallery" className="font-semibold text-sky-700 hover:underline dark:text-sky-300">
              {locale === "en" ? "Clear filters" : locale === "zh-Hans" ? "清除筛选" : "清除篩選"} →
            </Link>
          </div>
        ) : null}

        <form className="mt-5 flex flex-col gap-3 sm:flex-row" action="/gallery" method="get">
          <input
            name="q"
            defaultValue={query}
            placeholder={t(locale, "gallery.search.placeholder")}
            className="h-11 w-full flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/50 dark:text-slate-100"
          />
          {category ? <input type="hidden" name="cat" value={category} /> : null}
          {featuredOnly ? <input type="hidden" name="featured" value="1" /> : null}
          <button
            type="submit"
            className="h-11 rounded-xl border border-slate-200 bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
          >
            {t(locale, "gallery.search")}
          </button>
        </form>
      </div>

      {photos.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => {
            const author = p.user.name ?? p.user.email;
            return (
              <Link
                key={p.id}
                href={`/gallery/${encodeURIComponent(p.id)}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/80 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-sky-950/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/file/${encodeURIComponent(p.id)}?variant=display`}
                    alt={p.title ?? p.registration}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-black/40 px-2 py-1 text-xs font-extrabold tracking-wider text-white">
                        {p.registration}
                      </span>
                      <span className="rounded-lg bg-black/40 px-2 py-1 text-xs text-white">{p.aircraftModel}</span>
                      <span className="rounded-lg bg-black/40 px-2 py-1 text-xs text-white">{p.airline}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {p.title ?? `${p.registration}｜${p.aircraftModel}`}
                  </div>
                  <div className="mt-2 truncate text-xs text-slate-700 dark:text-slate-300">
                    {p.shotAirport} · {p.shotAt} · {author}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          {t(locale, "gallery.empty")}
        </div>
      )}
    </div>
  );
}

