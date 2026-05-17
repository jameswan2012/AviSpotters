import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";

function reasonLabel(locale: string, reason: string) {
  if (reason === "shop_purchase") return locale === "en" ? "Shop purchase" : locale === "zh-Hans" ? "商店兑换" : "商店兌換";
  if (reason === "lottery_spin") return locale === "en" ? "Lottery spin" : locale === "zh-Hans" ? "抽奖消耗" : "抽獎消耗";
  if (reason === "lottery_prize_points") return locale === "en" ? "Lottery points prize" : locale === "zh-Hans" ? "抽奖积分奖励" : "抽獎積分獎勵";
  if (reason === "manual_adjust") return locale === "en" ? "Manual adjustment" : locale === "zh-Hans" ? "手动调整" : "手動調整";
  return reason;
}

function couponStatus(locale: string, status: string) {
  if (status === "unused") return locale === "en" ? "Unused" : locale === "zh-Hans" ? "未使用" : "未使用";
  if (status === "used") return locale === "en" ? "Used" : locale === "zh-Hans" ? "已使用" : "已使用";
  if (status === "expired") return locale === "en" ? "Expired" : locale === "zh-Hans" ? "已过期" : "已過期";
  return status;
}

export default async function PointsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();

  const [ledger, coupons] = await Promise.all([
    prisma.pointLedger.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    }),
    prisma.lotteryCoupon.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    }),
  ]);

  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  const unusedCoupons = coupons.filter((coupon) => coupon.status === "unused").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{tr("積分與帳本", "积分与账本", "Points and ledger")}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {tr("查看目前積分、最近變動記錄，以及可用抽獎券。", "查看目前积分、最近变动记录，以及可用抽奖券。", "Check your current points, recent ledger entries, and available lottery coupons.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/shop" className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400">
              {tr("積分商店", "积分商店", "Reward shop")}
            </Link>
            <Link href="/lottery" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
              {tr("抽獎中心", "抽奖中心", "Lottery")}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={tr("目前積分", "当前积分", "Current points")} value={user.points.toLocaleString()} />
        <StatCard title={tr("可用抽獎券", "可用抽奖券", "Unused coupons")} value={unusedCoupons.toLocaleString()} />
        <StatCard title={tr("最近帳本筆數", "最近账本笔数", "Recent entries")} value={ledger.length.toLocaleString()} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{tr("積分帳本", "积分账本", "Points ledger")}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-3">{tr("時間", "时间", "Time")}</th>
                  <th className="px-3 py-3">{tr("原因", "原因", "Reason")}</th>
                  <th className="px-3 py-3">{tr("變動", "变动", "Delta")}</th>
                  <th className="px-3 py-3">{tr("餘額", "余额", "Balance")}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-200/70 dark:border-white/10">
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{entry.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{reasonLabel(locale, entry.reason)}</div>
                      {entry.description ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.description}</div> : null}
                    </td>
                    <td className={`px-3 py-3 font-semibold ${entry.delta >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}`}>
                      {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{entry.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!ledger.length ? <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">{tr("目前沒有帳本記錄。", "目前没有账本记录。", "No ledger entries yet.")}</div> : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{tr("抽獎券", "抽奖券", "Coupons")}</h2>
          <div className="mt-4 space-y-3">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{coupon.template.name}</div>
                    {coupon.template.description ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{coupon.template.description}</div> : null}
                  </div>
                  <span className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
                    {couponStatus(locale, coupon.status)}
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {tr("建立", "创建", "Created")}: {coupon.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  {coupon.usedAt ? ` · ${tr("使用", "使用", "Used")}: ${coupon.usedAt.toISOString().slice(0, 19).replace("T", " ")}` : ""}
                  {coupon.expiresAt ? ` · ${tr("到期", "到期", "Expires")}: ${coupon.expiresAt.toISOString().slice(0, 19).replace("T", " ")}` : ""}
                </div>
              </div>
            ))}
          </div>
          {!coupons.length ? <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">{tr("目前沒有抽獎券。", "目前没有抽奖券。", "No coupons yet.")}</div> : null}
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm text-slate-600 dark:text-slate-300">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
