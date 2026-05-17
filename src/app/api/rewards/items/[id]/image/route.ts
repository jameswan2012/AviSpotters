import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const item = await prisma.rewardItem.findUnique({
    where: { id },
    select: { imagePath: true, imageMime: true },
  });
  if (!item?.imagePath || !item.imageMime) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    const bytes = await readFile(item.imagePath);
    return new NextResponse(bytes, {
      headers: {
        "content-type": item.imageMime,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
