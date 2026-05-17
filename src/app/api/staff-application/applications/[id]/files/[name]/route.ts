import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { uploadsRoot } from "@/lib/uploads";

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; name: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, name } = await ctx.params;

  const app = await prisma.staffApplication.findUnique({
    where: { id },
    select: { userId: true, imagesJson: true },
  });
  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const can = user.id === app.userId || user.roleId >= 3;
  if (!can) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const images = safeParse<{ path: string; mime: string }[]>(app.imagesJson, []);
  const hit = images.find((im) => (im?.path || "").split("/").slice(-1)[0] === name);
  if (!hit) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const abs = path.join(uploadsRoot(), hit.path);
  const buf = await readFile(abs).catch(() => null);
  if (!buf) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return new NextResponse(buf, {
    headers: {
      "content-type": hit.mime || "application/octet-stream",
      "cache-control": "private, max-age=60",
    },
  });
}

