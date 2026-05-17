import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const prize = await prisma.lotteryPrize.findUnique({
    where: { id },
    select: { imagePath: true, imageMime: true },
  });
  if (!prize?.imagePath || !prize.imageMime) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    const bytes = await readFile(prize.imagePath);
    return new NextResponse(bytes, {
      headers: {
        "content-type": prize.imageMime,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
