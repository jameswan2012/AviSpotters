import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { redeemRewardItem } from "@/lib/reward-fulfillment";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { itemId?: string };
  const itemId = String(body.itemId || "").trim();
  if (!itemId) return NextResponse.json({ error: "item_required" }, { status: 400 });

  try {
    const order = await prisma.$transaction(async (tx) => {
      return redeemRewardItem(tx, {
        userId: user.id,
        itemId,
        source: "shop",
        actorId: user.id,
      });
    });
    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "redeem_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
