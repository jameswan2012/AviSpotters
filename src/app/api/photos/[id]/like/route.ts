import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function canAccessPhoto(photo: { status: string; userId: string }, sessionUserId: string | null) {
  if (photo.status === "approved") return { ok: true, roleId: 0 };
  if (!sessionUserId) return { ok: false as const, status: 401 as const };
  if (sessionUserId === photo.userId) return { ok: true, roleId: 0 };
  const u = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { roleId: true } });
  if (!u || (u.roleId ?? 0) < 2) return { ok: false as const, status: 403 as const };
  return { ok: true, roleId: u.roleId ?? 0 };
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({ where: { id }, select: { id: true, status: true, userId: true } });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = await getSession();
  const access = await canAccessPhoto(photo, session?.userId ?? null);
  if (!access.ok) return NextResponse.json({ error: "forbidden" }, { status: access.status });

  const [count, liked] = await Promise.all([
    prisma.photoLike.count({ where: { photoId: id } }),
    session?.userId ? prisma.photoLike.findUnique({ where: { photoId_userId: { photoId: id, userId: session.userId } }, select: { id: true } }) : Promise.resolve(null),
  ]);
  return NextResponse.json({ ok: true, count, liked: !!liked });
}

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({ where: { id }, select: { id: true, status: true, userId: true } });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const access = await canAccessPhoto(photo, session.userId);
  if (!access.ok) return NextResponse.json({ error: "forbidden" }, { status: access.status });
  if (photo.status !== "approved") return NextResponse.json({ error: "not_allowed" }, { status: 409 });

  const key = { photoId: id, userId: session.userId };
  const existing = await prisma.photoLike.findUnique({ where: { photoId_userId: key }, select: { id: true } });
  if (existing) {
    await prisma.photoLike.delete({ where: { photoId_userId: key } });
  } else {
    await prisma.photoLike.create({ data: key });
  }
  const count = await prisma.photoLike.count({ where: { photoId: id } });
  return NextResponse.json({ ok: true, count, liked: !existing });
}

