import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const variant = (searchParams.get("variant") ?? "display") as "display" | "original";

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, originalPath: true, displayPath: true, originalMime: true, displayMime: true },
  });
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isPublic = variant === "display" && photo.status === "approved";

  if (!isPublic) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (session.userId !== photo.userId) {
      const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { roleId: true } });
      if (!user || user.roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const absPath = variant === "original" ? photo.originalPath : photo.displayPath;
  const mime = variant === "original" ? photo.originalMime : photo.displayMime;

  const buf = await fs.readFile(absPath);
  return new Response(buf, {
    headers: {
      "content-type": mime || "application/octet-stream",
      "cache-control": isPublic ? "public, max-age=86400, stale-while-revalidate=604800" : "no-store",
    },
  });
}

