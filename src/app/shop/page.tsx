import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getServerLocaleOnly } from "@/i18n/server";
import { ShopRedeemButton } from "@/components/points/ShopRedeemButton";

function formatItemType(locale: string, itemType: string, virtualType: string | null) {
  if (itemType === "physical" || itemType === "lottery_custom_physical") {
    return locale === "en" ? "Physical" : locale === "zh-Hans" ? "实物" : "實體";
  }
  if (virtualType === "title") return locale === "en" ? "Title" : locale === "zh-Hans" ? "称号" : "稱號";
  if (virtualType === "image") return locale === "en" ? "Image" : locale === "zh-Hans" ? "图片" : "圖片";
  if (virtualType === "coupon") return locale === "en" ? "Coupon" : locale === "zh-Hans" ? "抽奖券" : "抽獎券";
  return locale === "en" ? "Virtual" : locale === "zh-Hans" ? "虚拟" : "虛擬";
}

export default async function ShopPage() {
  const [locale, user, items] = await Promise.all([
    getServerLocaleOnly(),
    getCurrentUser(),
    prisma.rewardItem.findMany({
      where: {
        active: true,
        itemType: { in: ["physical", "virtual", "lottery_custom_physical", "lottery_custom_virtual"] as any },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        itemType: true,
        virtualType: true,
        pricePoints: true,
        stock: true,
        imagePath: true,
        imageUpdatedAt: true,
        couponQuantity: true,
      },
      take: 100,
    }),
  ]);

  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.97),rgba(235,245,255,0.96)_50%,rgba(226,232,240,0.98))] px-6 py-10 shadow-[0_30px_80px_rgba(148,163,184,0.22)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(38,55,79,0.96),rgba(15,23,42,0.98)_55%,rgba(2,6,23,1))]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full bg-white/75 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-200">
              {tr("積分商店", "积分商店", "Shop")}
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[0.18em] text-slate-800 dark:text-white">{tr("兌換獎勵", "兑换奖励", "Redeem rewards")}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-200">
              {tr("使用積分兌換實體或虛擬獎勵。虛擬獎勵會直接發到你的帳號，實體獎勵會進入待出貨。", "使用积分兑换实体或虚拟奖励。虚拟奖励会直接发到你的账号，实体奖励会进入待发货。", "Redeem physical or virtual rewards with points. Virtual rewards are delivered directly to your account, while physical rewards will wait for shipment.")}
            </p>
          </div>

          <div className="rounded-[1.6rem] bg-white/80 px-5 py-4 text-sm shadow-sm dark:bg-white/10 dark:text-slate-100">
            <div className="text-slate-500 dark:text-slate-300">{tr("目前登入", "当前登录", "Signed in")}</div>
            <div className="mt-1 text-lg font-bold">{user?.name || user?.email || tr("未登入", "未登录", "Guest")}</div>
            <div className="mt-2 text-slate-600 dark:text-slate-300">
              {tr("積分", "积分", "Points")} {user?.points ?? 0}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {user ? (
                <Link href="/shop/orders" className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-400">
                  {tr("我的獎勵", "我的奖励", "My rewards")}
                </Link>
              ) : (
                <Link href="/login" className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-400">
                  {tr("登入", "登录", "Login")}
                </Link>
              )}
              <Link href="/lottery" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
                {tr("抽獎中心", "抽奖中心", "Lottery")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const imageUrl = item.imagePath ? `/api/rewards/items/${encodeURIComponent(item.id)}/image?v=${item.imageUpdatedAt ? new Date(item.imageUpdatedAt).getTime() : 0}` : null;
          const soldOut = item.stock <= 0;
          return (
            <div key={item.id} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-slate-950/70">
              <div className="rounded-[1.6rem] bg-[radial-gradient(circle_at_top,rgba(255,252,245,0.98),rgba(222,235,249,0.92))] p-4 dark:bg-[radial-gradient(circle_at_top,rgba(51,65,85,0.95),rgba(15,23,42,0.95))]">
                <div className="aspect-[4/3] overflow-hidden rounded-[1.3rem] bg-slate-100 dark:bg-slate-900">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-center text-lg font-black tracking-[0.14em] text-slate-400">
                      {item.name.slice(0, 16)}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-black tracking-[0.08em] text-slate-800 dark:text-white">{item.name}</div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description || "—"}</div>
                  </div>
                  <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
                    {formatItemType(locale, item.itemType, item.virtualType)}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">{item.pricePoints} {tr("積分", "积分", "pts")}</span>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                    {soldOut ? tr("已售罄", "已售罄", "Sold out") : `${tr("庫存", "库存", "Stock")} ${item.stock}`}
                  </span>
                  {item.virtualType === "coupon" && item.couponQuantity ? (
                    <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-fuchsia-700">{item.couponQuantity} {tr("張抽獎券", "张抽奖券", "coupons")}</span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <ShopRedeemButton itemId={item.id} disabled={soldOut} loginRequired={!user} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {!items.length ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {tr("目前沒有可兌換商品。", "目前没有可兑换商品。", "No reward items are available right now.")}
        </div>
      ) : null}
    </div>
  );
}
