import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type DbClient = PrismaClient | import("@prisma/client").Prisma.TransactionClient;

export const POINTS_SITE_KEY = "pointsSystem";

export type PointsSiteSetting = {
  enabled: boolean;
  monthlyCouponTemplateId: string | null;
  monthlyCouponQuantity: number;
};

export const DEFAULT_POINTS_SITE_SETTING: PointsSiteSetting = {
  enabled: true,
  monthlyCouponTemplateId: null,
  monthlyCouponQuantity: 1,
};

function normalizeSetting(value: unknown): PointsSiteSetting {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const quantity = Number(data.monthlyCouponQuantity);
  return {
    enabled: data.enabled !== false,
    monthlyCouponTemplateId: typeof data.monthlyCouponTemplateId === "string" && data.monthlyCouponTemplateId.trim() ? data.monthlyCouponTemplateId.trim() : null,
    monthlyCouponQuantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
  };
}

export async function getPointsSiteSetting(): Promise<PointsSiteSetting> {
  const row = await prisma.siteSetting.findUnique({ where: { key: POINTS_SITE_KEY }, select: { valueJson: true } });
  if (!row?.valueJson) return DEFAULT_POINTS_SITE_SETTING;
  try {
    return normalizeSetting(JSON.parse(row.valueJson));
  } catch {
    return DEFAULT_POINTS_SITE_SETTING;
  }
}

export async function setPointsSiteSetting(params: { setting: Partial<PointsSiteSetting>; updatedById?: string | null }) {
  const current = await getPointsSiteSetting();
  const next = normalizeSetting({ ...current, ...params.setting });
  await prisma.siteSetting.upsert({
    where: { key: POINTS_SITE_KEY },
    create: {
      key: POINTS_SITE_KEY,
      valueJson: JSON.stringify(next),
      updatedById: params.updatedById ?? null,
    },
    update: {
      valueJson: JSON.stringify(next),
      updatedById: params.updatedById ?? null,
    },
  });
  return next;
}

export async function addPointsLedgerEntry(
  db: DbClient,
  params: {
    userId: string;
    delta: number;
    reason: string;
    description?: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
    createdById?: string | null;
  }
) {
  const user = await db.user.findUnique({ where: { id: params.userId }, select: { points: true } });
  if (!user) throw new Error("user_not_found");
  const nextBalance = user.points + Math.trunc(params.delta);
  if (nextBalance < 0) throw new Error("insufficient_points");

  await db.user.update({
    where: { id: params.userId },
    data: { points: nextBalance },
  });

  return db.pointLedger.create({
    data: {
      userId: params.userId,
      delta: Math.trunc(params.delta),
      balanceAfter: nextBalance,
      reason: params.reason,
      description: params.description ?? null,
      relatedType: params.relatedType ?? null,
      relatedId: params.relatedId ?? null,
      createdById: params.createdById ?? null,
    },
  });
}

export async function issueLotteryCoupons(
  db: DbClient,
  params: {
    templateId: string;
    userId: string;
    quantity: number;
    source: string;
    sourceId?: string | null;
    issuedById?: string | null;
  }
) {
  const quantity = Math.max(1, Math.floor(params.quantity || 1));
  const rows = Array.from({ length: quantity }).map(() => ({
    templateId: params.templateId,
    userId: params.userId,
    status: "unused",
    source: params.source,
    sourceId: params.sourceId ?? null,
    issuedById: params.issuedById ?? null,
  }));
  await db.lotteryCoupon.createMany({ data: rows });
}
