import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

function toInt(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toProbabilityWeight(percent: unknown) {
  const value = Number(percent);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(1, Math.round(value * 1000));
}

function parsePrize(raw: any, index: number) {
  const rewardType = String(raw?.rewardType || "none") as "item" | "coupon" | "points" | "none" | "custom";
  return {
    id: raw?.id ? String(raw.id) : undefined,
    name: String(raw?.name || "").trim() || (rewardType === "none" ? "謝謝惠顧" : rewardType === "points" ? "積分獎勵" : `獎品 ${index + 1}`),
    description: String(raw?.description || "").trim() || null,
    probabilityWeight: toProbabilityWeight(raw?.probabilityPercent),
    stock: rewardType === "none" ? toInt(raw?.stock, 0) : Math.max(0, toInt(raw?.stock, 0)),
    rewardType,
    rewardItemId: rewardType === "item" || rewardType === "custom" ? String(raw?.rewardItemId || "").trim() || null : null,
    couponTemplateId: rewardType === "coupon" ? String(raw?.couponTemplateId || "").trim() || null : null,
    couponQuantity: rewardType === "coupon" || rewardType === "points" ? Math.max(1, toInt(raw?.couponQuantity, 1)) : null,
    sortOrder: index,
    active: true,
  };
}

function parseWheel(raw: any) {
  const prizes = Array.isArray(raw?.prizes) ? raw.prizes.map(parsePrize).filter((prize) => prize.probabilityWeight > 0) : [];
  return {
    id: raw?.id ? String(raw.id) : undefined,
    name: String(raw?.name || "").trim(),
    description: String(raw?.description || "").trim() || null,
    backgroundStyle: String(raw?.backgroundStyle || "").trim() || "cloud-blue",
    usePoints: !!raw?.usePoints,
    spinCostPoints: Math.max(0, toInt(raw?.spinCostPoints, 0)),
    spinDurationMs: Math.max(1200, toInt(raw?.spinDurationMs, 3600)),
    useCoupon: !!raw?.useCoupon,
    couponTemplateId: raw?.useCoupon ? String(raw?.couponTemplateId || "").trim() || null : null,
    active: raw?.active !== false,
    prizes,
  };
}

async function serialize() {
  const [rewardItems, couponTemplates, wheels] = await Promise.all([
    prisma.rewardItem.findMany({
      where: { itemType: { in: ["physical", "virtual", "lottery_custom_physical", "lottery_custom_virtual"] as any } },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, name: true },
    }),
    prisma.lotteryCouponTemplate.findMany({
      where: { active: true },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, name: true },
    }),
    prisma.lotteryWheel.findMany({
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        backgroundStyle: true,
        usePoints: true,
        spinCostPoints: true,
        spinDurationMs: true,
        useCoupon: true,
        couponTemplateId: true,
        active: true,
        prizes: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            description: true,
            probabilityWeight: true,
            stock: true,
            rewardType: true,
            rewardItemId: true,
            couponTemplateId: true,
            couponQuantity: true,
          },
        },
      },
    }),
  ]);
  return { rewardItems, couponTemplates, wheels };
}

export async function GET() {
  await requireAdmin();
  return NextResponse.json(await serialize());
}

export async function POST(request: Request) {
  const { user, roleId } = await requireAdmin();
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { wheel?: unknown };
  const wheel = parseWheel(body.wheel);
  if (!wheel.name) return NextResponse.json({ error: "wheel_name_required" }, { status: 400 });
  if (!wheel.prizes.length) return NextResponse.json({ error: "at_least_one_prize_required" }, { status: 400 });

  const created = await prisma.$transaction(async (tx) => {
    const createdWheel = await tx.lotteryWheel.create({
      data: {
        name: wheel.name,
        description: wheel.description,
        backgroundStyle: wheel.backgroundStyle,
        usePoints: wheel.usePoints,
        spinCostPoints: wheel.spinCostPoints,
        spinDurationMs: wheel.spinDurationMs,
        useCoupon: wheel.useCoupon,
        couponTemplateId: wheel.couponTemplateId,
        active: wheel.active,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true },
    });

    await tx.lotteryPrize.createMany({
      data: wheel.prizes.map((prize) => ({
        wheelId: createdWheel.id,
        name: prize.name,
        description: prize.description,
        probabilityWeight: prize.probabilityWeight,
        stock: prize.stock,
        rewardType: prize.rewardType,
        rewardItemId: prize.rewardItemId,
        couponTemplateId: prize.couponTemplateId,
        couponQuantity: prize.couponQuantity,
        sortOrder: prize.sortOrder,
        active: true,
      })),
    });

    return createdWheel;
  });

  return NextResponse.json({ ok: true, wheel: created, ...(await serialize()) });
}

export async function PATCH(request: Request) {
  const { user, roleId } = await requireAdmin();
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { wheel?: unknown };
  const wheel = parseWheel(body.wheel);
  if (!wheel.id) return NextResponse.json({ error: "wheel_id_required" }, { status: 400 });
  if (!wheel.name) return NextResponse.json({ error: "wheel_name_required" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.lotteryWheel.update({
      where: { id: wheel.id! },
      data: {
        name: wheel.name,
        description: wheel.description,
        backgroundStyle: wheel.backgroundStyle,
        usePoints: wheel.usePoints,
        spinCostPoints: wheel.spinCostPoints,
        spinDurationMs: wheel.spinDurationMs,
        useCoupon: wheel.useCoupon,
        couponTemplateId: wheel.couponTemplateId,
        active: wheel.active,
        updatedById: user.id,
      },
    });

    const existing = await tx.lotteryPrize.findMany({
      where: { wheelId: wheel.id! },
      select: { id: true },
    });
    const keepIds = new Set(wheel.prizes.map((prize) => prize.id).filter(Boolean));
    const deleteIds = existing.map((prize) => prize.id).filter((id) => !keepIds.has(id));
    if (deleteIds.length) {
      await tx.lotteryPrize.deleteMany({ where: { id: { in: deleteIds } } });
    }

    for (const prize of wheel.prizes) {
      if (prize.id) {
        await tx.lotteryPrize.update({
          where: { id: prize.id },
          data: {
            name: prize.name,
            description: prize.description,
            probabilityWeight: prize.probabilityWeight,
            stock: prize.stock,
            rewardType: prize.rewardType,
            rewardItemId: prize.rewardItemId,
            couponTemplateId: prize.couponTemplateId,
            couponQuantity: prize.couponQuantity,
            sortOrder: prize.sortOrder,
            active: true,
          },
        });
      } else {
        await tx.lotteryPrize.create({
          data: {
            wheelId: wheel.id!,
            name: prize.name,
            description: prize.description,
            probabilityWeight: prize.probabilityWeight,
            stock: prize.stock,
            rewardType: prize.rewardType,
            rewardItemId: prize.rewardItemId,
            couponTemplateId: prize.couponTemplateId,
            couponQuantity: prize.couponQuantity,
            sortOrder: prize.sortOrder,
            active: true,
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true, wheel: { id: wheel.id }, ...(await serialize()) });
}

export async function DELETE(request: Request) {
  const { roleId } = await requireAdmin();
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { wheelId?: string };
  const wheelId = String(body.wheelId || "").trim();
  if (!wheelId) return NextResponse.json({ error: "wheel_id_required" }, { status: 400 });

  await prisma.lotteryWheel.delete({ where: { id: wheelId } });
  return NextResponse.json({ ok: true, ...(await serialize()) });
}
