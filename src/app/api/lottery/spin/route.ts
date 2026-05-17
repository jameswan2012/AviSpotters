import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { addPointsLedgerEntry, issueLotteryCoupons } from "@/lib/points-system";
import { redeemRewardItem } from "@/lib/reward-fulfillment";

function pickPrize<T extends { probabilityWeight: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.probabilityWeight), 0);
  if (total <= 0 || !items.length) return null;
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.probabilityWeight);
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    wheelId?: string;
    mode?: "points" | "coupon";
  };
  const wheelId = String(body.wheelId ?? "").trim();
  const mode = body.mode === "coupon" ? "coupon" : "points";
  if (!wheelId) {
    return NextResponse.json({ error: "wheel_required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wheel = await tx.lotteryWheel.findUnique({
        where: { id: wheelId },
        include: {
          couponTemplate: { select: { id: true, name: true } },
          prizes: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              rewardItem: true,
              couponTemplate: true,
            },
          },
        },
      });

      if (!wheel || !wheel.active) throw new Error("wheel_not_found");
      const now = new Date();
      if (wheel.startsAt && wheel.startsAt.getTime() > now.getTime()) throw new Error("wheel_not_started");
      if (wheel.endsAt && wheel.endsAt.getTime() < now.getTime()) throw new Error("wheel_ended");

      let usedCouponId: string | null = null;
      if (mode === "coupon") {
        if (!wheel.useCoupon || !wheel.couponTemplateId) throw new Error("coupon_mode_disabled");
        const coupon = await tx.lotteryCoupon.findFirst({
          where: {
            userId: user.id,
            templateId: wheel.couponTemplateId,
            status: "unused",
          },
          orderBy: [{ createdAt: "asc" }],
        });
        if (!coupon) throw new Error("coupon_not_available");
        await tx.lotteryCoupon.update({
          where: { id: coupon.id },
          data: {
            status: "used",
            usedAt: now,
            usedOnWheelId: wheel.id,
          },
        });
        usedCouponId = coupon.id;
      } else {
        if (!wheel.usePoints) throw new Error("points_mode_disabled");
        if (user.points < wheel.spinCostPoints) throw new Error("insufficient_points");
        if (wheel.spinCostPoints > 0) {
          await addPointsLedgerEntry(tx, {
            userId: user.id,
            delta: -wheel.spinCostPoints,
            reason: "lottery_spin",
            description: `Spin on ${wheel.name}`,
            relatedType: "lottery_wheel",
            relatedId: wheel.id,
            createdById: user.id,
          });
        }
      }

      const availablePrizes = wheel.prizes.filter((prize) => {
        if (prize.rewardType === "none") return true;
        return prize.stock > 0;
      });
      const picked = pickPrize(availablePrizes);
      if (!picked) throw new Error("prize_not_available");

      if (picked.rewardType !== "none" && picked.stock > 0) {
        await tx.lotteryPrize.update({
          where: { id: picked.id },
          data: { stock: { decrement: 1 } },
        });
      }

      if ((picked.rewardType === "item" || picked.rewardType === "custom") && picked.rewardItemId) {
        await redeemRewardItem(tx, {
          userId: user.id,
          itemId: picked.rewardItemId,
          source: "lottery",
          actorId: user.id,
        });
      } else if (picked.rewardType === "coupon" && picked.couponTemplateId) {
        await issueLotteryCoupons(tx, {
          templateId: picked.couponTemplateId,
          userId: user.id,
          quantity: Math.max(1, picked.couponQuantity ?? 1),
          source: "lottery_prize",
          sourceId: picked.id,
          issuedById: user.id,
        });
      } else if (picked.rewardType === "points") {
        const pointsDelta = Math.max(0, picked.couponQuantity ?? 0);
        if (pointsDelta > 0) {
          await addPointsLedgerEntry(tx, {
            userId: user.id,
            delta: pointsDelta,
            reason: "lottery_prize_points",
            description: picked.name || `Points prize from ${wheel.name}`,
            relatedType: "lottery_prize",
            relatedId: picked.id,
            createdById: user.id,
          });
        }
      }

      const resultName =
        picked.rewardType === "none"
          ? "謝謝惠顧"
          : picked.rewardType === "points"
            ? `${Math.max(0, picked.couponQuantity ?? 0)} 積分`
            : picked.rewardType === "coupon"
              ? picked.couponTemplate?.name || picked.name
              : picked.rewardItem?.name || picked.name;

      await tx.lotterySpin.create({
        data: {
          wheelId: wheel.id,
          userId: user.id,
          prizeId: picked.id,
          costPoints: mode === "points" ? wheel.spinCostPoints : 0,
          usedCouponId,
          resultName,
        },
      });

      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { points: true },
      });

      return {
        prizeId: picked.id,
        prizeName: resultName,
        currentPoints: currentUser?.points ?? user.points,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "spin_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
