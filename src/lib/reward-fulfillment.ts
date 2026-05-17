import type { PrismaClient } from "@prisma/client";
import { addPointsLedgerEntry, issueLotteryCoupons } from "@/lib/points-system";

type DbClient = PrismaClient | import("@prisma/client").Prisma.TransactionClient;

export async function redeemRewardItem(
  db: DbClient,
  params: {
    userId: string;
    itemId: string;
    source: "shop" | "lottery";
    pointsPaid?: number;
    actorId?: string | null;
  }
) {
  const item = await db.rewardItem.findUnique({
    where: { id: params.itemId },
    include: {
      inventoryUnits: {
        where: { consumedAt: null },
        orderBy: [{ createdAt: "asc" }],
        take: 1,
      },
    },
  });

  if (!item || !item.active) throw new Error("item_not_found");
  if (item.stock <= 0) throw new Error("out_of_stock");

  const pointsPaid = Math.max(0, Math.floor(params.pointsPaid ?? (params.source === "shop" ? item.pricePoints : 0)));
  if (pointsPaid > 0) {
    const buyer = await db.user.findUnique({ where: { id: params.userId }, select: { points: true } });
    if (!buyer) throw new Error("user_not_found");
    if (buyer.points < pointsPaid) throw new Error("insufficient_points");
  }

  const now = new Date();
  const inventoryUnit = item.inventoryUnits[0] ?? null;
  const isPhysical = item.itemType === "physical" || item.itemType === "lottery_custom_physical";
  const isVirtual = !isPhysical;

  if (isVirtual && item.virtualType !== "coupon" && !inventoryUnit) {
    const hasFixedVirtualContent =
      (item.virtualType === "text" && !!item.virtualTextContent) ||
      (item.virtualType === "title" && !!item.virtualTitleText) ||
      (item.virtualType === "image" && !!item.imagePath);
    if (!hasFixedVirtualContent) throw new Error("virtual_stock_empty");
  }

  const order = await db.rewardOrder.create({
    data: {
      userId: params.userId,
      itemId: item.id,
      source: params.source,
      status: isVirtual ? "fulfilled" : "pending_shipment",
      pointsPaid,
      fulfilledById: isVirtual ? params.actorId ?? null : null,
      fulfilledAt: isVirtual ? now : null,
      deliveryText: inventoryUnit?.contentText ?? item.virtualTextContent ?? null,
      deliveryTitle: inventoryUnit?.titleText ?? item.virtualTitleText ?? null,
      deliveryImagePath: inventoryUnit?.imagePath ?? item.imagePath ?? null,
      deliveryImageMime: inventoryUnit?.imageMime ?? item.imageMime ?? null,
      deliveryImageSizeBytes: inventoryUnit?.imageSizeBytes ?? item.imageSizeBytes ?? null,
    },
  });

  await db.rewardItem.update({
    where: { id: item.id },
    data: { stock: { decrement: 1 } },
  });

  if (inventoryUnit) {
    await db.rewardInventoryUnit.update({
      where: { id: inventoryUnit.id },
      data: {
        consumedByOrderId: order.id,
        consumedByUserId: params.userId,
        consumedAt: now,
      },
    });
  }

  if (pointsPaid > 0) {
    await addPointsLedgerEntry(db, {
      userId: params.userId,
      delta: -pointsPaid,
      reason: "shop_purchase",
      description: `Redeemed ${item.name}`,
      relatedType: "reward_order",
      relatedId: order.id,
      createdById: params.actorId ?? params.userId,
    });
  }

  if (isVirtual && item.virtualType === "title" && (inventoryUnit?.titleText || item.virtualTitleText)) {
    await db.user.update({
      where: { id: params.userId },
      data: { displayTitle: inventoryUnit?.titleText ?? item.virtualTitleText ?? null },
    });
  }

  if (isVirtual && item.virtualType === "coupon") {
    if (!item.couponTemplateId || !item.couponQuantity) throw new Error("coupon_reward_invalid");
    await issueLotteryCoupons(db, {
      templateId: item.couponTemplateId,
      userId: params.userId,
      quantity: item.couponQuantity,
      source: params.source === "shop" ? "shop_purchase" : "lottery_prize",
      sourceId: order.id,
      issuedById: params.actorId ?? null,
    });
  }

  return order;
}
