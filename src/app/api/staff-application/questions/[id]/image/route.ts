import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { uploadsRoot } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const q = await prisma.staffApplicationQuestion.findUnique({
    where: { id },
    select: { imagePath: true, imageMime: true, active: true },
  });
  if (!q || !q.imagePath) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Applicant-side access (roleId < 2) or staff can view.
  const absPath = path.join(uploadsRoot(), q.imagePath);
  const buf = await readFile(absPath).catch(() => null);
  if (!buf) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return new NextResponse(buf, {
    headers: {
      "content-type": q.imageMime || "application/octet-stream",
      "cache-control": "private, max-age=60",
    },
  });
}

