import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; commentId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, commentId } = await ctx.params;

  const [comment, me] = await Promise.all([
    prisma.photoComment.findUnique({ where: { id: commentId }, select: { id: true, photoId: true, userId: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { roleId: true } }),
  ]);
  if (!comment || comment.photoId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const isOwner = comment.userId === session.userId;
  const isStaff = (me?.roleId ?? 0) >= 2;
  if (!isOwner && !isStaff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.photoComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
