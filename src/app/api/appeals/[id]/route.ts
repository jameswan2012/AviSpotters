import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const appeal = await prisma.appeal.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!appeal || appeal.userId !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (appeal.status !== "open") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.appeal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

