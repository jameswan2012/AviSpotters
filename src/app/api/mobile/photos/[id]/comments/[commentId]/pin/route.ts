import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: Request, ctx: { params: Promise<{ id: string; commentId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { roleId: true } });
  if (!me || (me.roleId ?? 0) < 3) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, commentId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { pinned?: boolean };
  const pinned = typeof body.pinned === "boolean" ? body.pinned : true;

  const comment = await prisma.photoComment.findUnique({
    where: { id: commentId },
    select: { id: true, photoId: true },
  });
  if (!comment || comment.photoId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.photoComment.update({
    where: { id: commentId },
    data: { pinned },
  });
  return NextResponse.json({ ok: true, pinned });
}
