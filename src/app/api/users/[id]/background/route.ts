import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { backgroundPath: true, backgroundMime: true, backgroundUpdatedAt: true },
  });
  if (!u?.backgroundPath) return NextResponse.json({ error: "not found" }, { status: 404 });

  const buf = await fs.readFile(u.backgroundPath);
  return new Response(buf, {
    headers: {
      "content-type": u.backgroundMime || "application/octet-stream",
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

