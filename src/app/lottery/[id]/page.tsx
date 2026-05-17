import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";
import { LotteryWheelPageClient } from "@/components/points/LotteryWheelPageClient";

export default async function LotteryWheelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getServerLocaleOnly();
  const wheel = await prisma.lotteryWheel.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      backgroundStyle: true,
      usePoints: true,
      spinCostPoints: true,
      spinDurationMs: true,
      useCoupon: true,
      couponTemplate: { select: { id: true, name: true } },
      prizes: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          imagePath: true,
          imageUpdatedAt: true,
          probabilityWeight: true,
          stock: true,
          rewardType: true,
          rewardItemId: true,
          couponTemplateId: true,
          couponQuantity: true,
          rewardItem: {
            select: {
              id: true,
              name: true,
              description: true,
              itemType: true,
              virtualType: true,
              imagePath: true,
              imageUpdatedAt: true,
            },
          },
          couponTemplate: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!wheel || !wheel.prizes.length) notFound();

  const couponCount =
    wheel.useCoupon && wheel.couponTemplate?.id
      ? await prisma.lotteryCoupon.count({
          where: {
            userId: user.id,
            templateId: wheel.couponTemplate.id,
            status: "unused",
          },
        })
      : 0;

  return <LotteryWheelPageClient locale={locale} initialPoints={user.points} initialCouponCount={couponCount} wheel={wheel} />;
}
