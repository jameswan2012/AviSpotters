import Link from "next/link";

export type FeaturedPhotoItem = {
  id: string;
  title: string | null;
  registration: string;
  airline: string;
  aircraftModel: string;
  shotAirport: string;
  shotAt: string;
};

export function FeaturedPhotoScroller({
  title,
  subtitle,
  photos,
  hrefAll,
}: {
  title: string;
  subtitle: string;
  photos: FeaturedPhotoItem[];
  hrefAll: string;
}) {
  if (!photos.length) return null;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{subtitle}</p> : null}
        </div>
        <Link
          href={hrefAll}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
        >
          查看更多 →
        </Link>
      </div>

      <div className="mt-5 -mx-6 px-6 md:-mx-8 md:px-8">
        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {photos.map((p) => (
            <Link
              key={p.id}
              href={`/photos/${encodeURIComponent(p.id)}`}
              className="snap-start shrink-0 w-[78%] sm:w-[52%] lg:w-[38%] group"
            >
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/5 dark:border-white/10 dark:bg-white/5">
                <div className="relative aspect-[16/10] bg-slate-100 dark:bg-sky-950/30">
                  {/* blurred background */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=thumb`}
                    alt=""
                    className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-60 sm:blur-2xl sm:opacity-70"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                  {/* foreground */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=display`}
                    alt={p.title ?? p.registration}
                    className="relative h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-black/40 px-2 py-1 text-xs font-extrabold tracking-wider text-white">
                        {p.registration}
                      </span>
                      <span className="rounded-lg bg-black/40 px-2 py-1 text-xs text-white">{p.aircraftModel}</span>
                      <span className="rounded-lg bg-black/40 px-2 py-1 text-xs text-white">{p.airline}</span>
                    </div>
                    <div className="mt-2 truncate text-sm font-semibold text-white">
                      {p.title ?? `${p.registration}｜${p.aircraftModel}`}
                    </div>
                    <div className="mt-1 truncate text-xs text-white/80">
                      {p.shotAirport} · {p.shotAt}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">提示：左右滑動可瀏覽精選作品。</div>
    </section>
  );
}

