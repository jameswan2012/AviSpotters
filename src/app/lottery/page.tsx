import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { getLotteryOverride } from "@/lib/page-content";

function wheelCardTheme(style?: string | null) {
  if (style === "cloud-gold") {
    return "bg-[radial-gradient(circle_at_top,rgba(255,250,240,0.98),rgba(249,240,214,0.94)_48%,rgba(238,231,214,0.98))]";
  }
  if (style === "night-slate") {
    return "bg-[radial-gradient(circle_at_top,rgba(51,65,85,0.98),rgba(15,23,42,0.96)_55%,rgba(2,6,23,1))]";
  }
  return "bg-[radial-gradient(circle_at_top,rgba(255,252,245,0.98),rgba(222,235,249,0.92))]";
}

export default async function LotteryHubPage() {
  const locale = await getServerLocaleOnly();
  const content = await getLotteryOverride(locale);
  const user = await getCurrentUser();
  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);

  const wheels = await prisma.lotteryWheel.findMany({
    where: { active: true },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      backgroundStyle: true,
      usePoints: true,
      spinCostPoints: true,
      useCoupon: true,
      couponTemplate: { select: { id: true, name: true } },
      prizes: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 3,
        select: {
          id: true,
          name: true,
          rewardType: true,
          couponQuantity: true,
          imagePath: true,
          imageUpdatedAt: true,
          rewardItem: {
            select: {
              id: true,
              name: true,
              imagePath: true,
              imageUpdatedAt: true,
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.2rem] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.97),rgba(235,245,255,0.96)_50%,rgba(226,232,240,0.98))] px-6 py-10 shadow-[0_30px_80px_rgba(148,163,184,0.22)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(38,55,79,0.96),rgba(15,23,42,0.98)_55%,rgba(2,6,23,1))]">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-white/75 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-200">
                {tr("抽獎中心", "抽奖中心", "Lottery")}
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-[0.18em] text-slate-800 dark:text-white">{tr("選擇一個轉盤", "选择一个转盘", "Choose a wheel")}</h1>
              {content?.description ? (
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-200">{content.description}</p>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-200">
                  {tr("每個轉盤現在都是單獨頁面，可直接進入查看獎品與抽獎方式。", "每个转盘现在都是单独页面，可直接进入查看奖品与抽奖方式。", "Each wheel now has its own page with its prize list and draw options.")}
                </p>
              )}
            </div>

            <div className="rounded-[1.6rem] bg-white/80 px-5 py-4 text-sm shadow-sm dark:bg-white/10 dark:text-slate-100">
              <div className="text-slate-500 dark:text-slate-300">{tr("目前登入", "当前登录", "Signed in")}</div>
              <div className="mt-1 text-lg font-bold">{user?.name || user?.email || tr("未登入", "未登录", "Guest")}</div>
              <div className="mt-2 text-slate-600 dark:text-slate-300">
                {tr("積分", "积分", "Points")} {user?.points ?? 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {wheels.map((wheel) => (
          <Link
            key={wheel.id}
            href={`/lottery/${wheel.id}`}
            className="group overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(148,163,184,0.18)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(148,163,184,0.24)] dark:border-white/10 dark:bg-slate-950/70"
          >
            <div className={`rounded-[1.6rem] p-4 ${wheelCardTheme(wheel.backgroundStyle)}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-black tracking-[0.12em] text-slate-800 dark:text-white">{wheel.name}</div>
                  {wheel.description ? <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{wheel.description}</div> : null}
                </div>
                <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-slate-900">{tr("進入", "进入", "Open")}</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                {wheel.usePoints ? <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">{wheel.spinCostPoints}{tr(" 積分/次", " 积分/次", " pts / spin")}</span> : null}
                {wheel.useCoupon ? <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">{wheel.couponTemplate?.name || tr("抽獎券", "抽奖券", "Coupon")}</span> : null}
                <span className="rounded-full bg-white/80 px-3 py-1 text-slate-700">{wheel.prizes.length}{tr(" 個獎品", " 个奖品", " prizes")}</span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {wheel.prizes.map((prize) => {
                  const image = prize.imagePath
                    ? `/api/lottery/prizes/${encodeURIComponent(prize.id)}/image?v=${prize.imageUpdatedAt ? new Date(prize.imageUpdatedAt).getTime() : 0}`
                    : prize.rewardItem?.imagePath
                      ? `/api/rewards/items/${encodeURIComponent(prize.rewardItem.id)}/image?v=${prize.rewardItem.imageUpdatedAt ? new Date(prize.rewardItem.imageUpdatedAt).getTime() : 0}`
                      : null;
                  const name =
                    prize.rewardType === "points"
                      ? `${prize.couponQuantity ?? 0}${tr(" 積分", " 积分", " pts")}`
                      : prize.rewardType === "none"
                        ? tr("謝謝惠顧", "谢谢惠顾", "Thanks")
                        : prize.rewardItem?.name || prize.name;
                  return (
                    <div key={prize.id} className="overflow-hidden rounded-[1.2rem] border border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <div className="aspect-square bg-slate-100 dark:bg-slate-900">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs font-black text-slate-400">{name.slice(0, 8)}</div>
                        )}
                      </div>
                      <div className="truncate px-2 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-100">{name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
