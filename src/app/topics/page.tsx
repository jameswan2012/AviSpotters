import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function TopicsPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const activeTopic = String(sp.topic || "").trim().toLowerCase();

  const topicDefs = [
    { slug: "special-livery", id: "special_livery", label: locale === "en" ? "Special Livery" : locale === "zh-Hans" ? "特殊涂装" : "特殊塗裝" },
    { slug: "airport", id: "airport", label: locale === "en" ? "Airport" : locale === "zh-Hans" ? "机场" : "機場" },
    { slug: "cabin", id: "cabin", label: locale === "en" ? "Cabin" : locale === "zh-Hans" ? "客舱" : "客艙" },
    { slug: "cockpit", id: "cockpit", label: locale === "en" ? "Cockpit" : locale === "zh-Hans" ? "驾驶舱" : "駕駛艙" },
    { slug: "night", id: "night_shot", label: locale === "en" ? "Night Shot" : locale === "zh-Hans" ? "夜拍" : "夜拍" },
    { slug: "airshow", id: "airshow", label: locale === "en" ? "Airshow" : locale === "zh-Hans" ? "航展" : "航展" },
    { slug: "special-plane", id: "special_plane", label: locale === "en" ? "Special Plane" : locale === "zh-Hans" ? "专机" : "專機" },
    { slug: "style", id: "style", label: locale === "en" ? "Style Shots" : locale === "zh-Hans" ? "风格图" : "風格圖" },
  ] as const;

  const selectedTopics = activeTopic
    ? topicDefs.filter((topic) => topic.slug.toLowerCase() === activeTopic || topic.id.toLowerCase() === activeTopic)
    : topicDefs;
  const visibleTopics = selectedTopics.length ? selectedTopics : topicDefs;

  const topicTop = await Promise.all(
    visibleTopics.map(async (topic) => {
      const rows = await prisma.photo.findMany({
        where: { status: "approved", categoriesJson: { contains: `"${topic.id}"` } },
        orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
        take: 5,
        select: { id: true, title: true, registration: true, _count: { select: { likes: true } } },
      });
      return { topic, rows };
    })
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {locale === "en" ? "Topics" : locale === "zh-Hans" ? "题材" : "題材"}
        </h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {locale === "en" ? "Browse by topic and see the top liked shots." : locale === "zh-Hans" ? "按题材浏览，并展示每个题材点赞前 5。" : "按題材瀏覽，並展示每個題材點讚前 5。"}
        </p>
        {activeTopic ? (
          <div className="mt-3">
            <Link href="/topics" className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
              {locale === "en" ? "Show all topics" : locale === "zh-Hans" ? "显示全部题材" : "顯示全部題材"} →
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {topicTop.map(({ topic, rows }) => (
          <div key={topic.slug} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-end justify-between gap-3">
              <div className="text-lg font-semibold text-slate-900 dark:text-white">{topic.label}</div>
              <Link href={`/gallery?cat=${encodeURIComponent(topic.id)}`} className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
                {locale === "en" ? "View All" : locale === "zh-Hans" ? "查看全部" : "查看全部"} →
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {rows.map((p) => (
                <Link key={p.id} href={`/photos/${encodeURIComponent(p.id)}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${encodeURIComponent(p.id)}/image?variant=thumb`}
                    alt={p.title ?? p.registration}
                    className="h-24 w-full bg-slate-100 object-contain dark:bg-white/5"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="p-2">
                    <div className="truncate text-[11px] font-extrabold tracking-wider text-slate-700 dark:text-slate-200">{p.registration}</div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">♥ {p._count.likes}</div>
                  </div>
                </Link>
              ))}
              {rows.length < 5
                ? Array.from({ length: 5 - rows.length }).map((_, i) => (
                    <div
                      key={`empty-${topic.slug}-${i}`}
                      className="h-[100px] rounded-xl border border-dashed border-slate-200 bg-white/40 dark:border-white/10 dark:bg-white/5"
                    />
                  ))
                : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
