import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await (prisma as any).news.findUnique({
    where: { id },
    select: { imagePath: true, imageMime: true },
  });
  if (!row?.imagePath) return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = await fs.readFile(row.imagePath);
  return new Response(buf, {
    headers: {
      "content-type": row.imageMime || "application/octet-stream",
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

