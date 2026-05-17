import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";

function statusLabel(locale: string, status: string) {
  if (status === "fulfilled") return locale === "en" ? "Fulfilled" : locale === "zh-Hans" ? "已发放" : "已發放";
  if (status === "pending_shipment") return locale === "en" ? "Pending shipment" : locale === "zh-Hans" ? "待发货" : "待發貨";
  return status;
}

export default async function ShopOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();

  const orders = await prisma.rewardOrder.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }],
    include: {
      item: {
        select: {
          id: true,
          name: true,
          description: true,
          imagePath: true,
          imageUpdatedAt: true,
          itemType: true,
          virtualType: true,
        },
      },
    },
    take: 100,
  });

  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{tr("我的獎勵", "我的奖励", "My rewards")}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {tr("這裡會顯示你在商店或抽獎獲得的獎勵內容。", "这里会显示你在商店或抽奖获得的奖励内容。", "Rewards redeemed from the shop or won from lottery appear here.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/shop" className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
              {tr("返回商店", "返回商店", "Back to shop")}
            </Link>
            <Link href="/lottery" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
              {tr("抽獎中心", "抽奖中心", "Lottery")}
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const itemImage = order.item.imagePath
            ? `/api/rewards/items/${encodeURIComponent(order.item.id)}/image?v=${order.item.imageUpdatedAt ? new Date(order.item.imageUpdatedAt).getTime() : 0}`
            : null;
          const deliveryImage = order.deliveryImagePath ? `/api/shop/orders/${encodeURIComponent(order.id)}/image` : null;
          return (
            <div key={order.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="bg-slate-100 dark:bg-slate-900">
                  {deliveryImage || itemImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={deliveryImage || itemImage || ""} alt={order.item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full min-h-[180px] place-items-center text-center text-sm font-bold text-slate-400">{order.item.name}</div>
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xl font-semibold text-slate-900 dark:text-white">{order.item.name}</div>
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{order.item.description || "—"}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
                        {statusLabel(locale, order.status)}
                      </span>
                      <span className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-200">
                        {order.pointsPaid} {tr("積分", "积分", "pts")}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Info label={tr("來源", "来源", "Source")} value={order.source} />
                    <Info label={tr("建立時間", "创建时间", "Created")} value={order.createdAt.toISOString().slice(0, 19).replace("T", " ")} />
                    <Info label={tr("發放時間", "发放时间", "Fulfilled")} value={order.fulfilledAt ? order.fulfilledAt.toISOString().slice(0, 19).replace("T", " ") : "—"} />
                    <Info label={tr("物流單號", "物流单号", "Tracking")} value={order.trackingNumber || "—"} />
                  </div>

                  {order.deliveryTitle ? (
                    <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-900 dark:text-fuchsia-100">
                      <div className="text-xs font-semibold opacity-80">{tr("已發放稱號", "已发放称号", "Granted title")}</div>
                      <div className="mt-1 text-base font-semibold">{order.deliveryTitle}</div>
                    </div>
                  ) : null}

                  {order.deliveryText ? (
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap">
                      <div className="text-xs font-semibold opacity-80">{tr("發放內容", "发放内容", "Delivered content")}</div>
                      <div className="mt-2">{order.deliveryText}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!orders.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {tr("你目前還沒有獎勵訂單。", "你目前还没有奖励订单。", "You do not have any reward orders yet.")}
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-black/20">
      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white break-words">{value}</div>
    </div>
  );
}
