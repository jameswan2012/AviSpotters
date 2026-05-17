import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { roleId } = await requireStaff();
  if (roleId < 3) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;

  const video = await prisma.video.findUnique({ 
    where: { id },
    select: { id: true, status: true }
  });
  
  if (!video) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (video.status === "rejected") {
    return NextResponse.json({ error: "already_deleted" }, { status: 400 });
  }

  await prisma.video.update({
    where: { id },
    data: { status: "rejected" },
  });

  return NextResponse.json({ ok: true });
}
