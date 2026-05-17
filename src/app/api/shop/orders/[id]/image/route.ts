import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const order = await prisma.rewardOrder.findUnique({
    where: { id },
    select: {
      userId: true,
      deliveryImagePath: true,
      deliveryImageMime: true,
    },
  });
  if (!order || order.userId !== user.id || !order.deliveryImagePath || !order.deliveryImageMime) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const bytes = await readFile(order.deliveryImagePath);
    return new NextResponse(bytes, {
      headers: {
        "content-type": order.deliveryImageMime,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
