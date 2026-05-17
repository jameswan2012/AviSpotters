import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { deletePhotoUploadDir } from "@/lib/photo-delete";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      registration: true,
      airline: true,
      aircraftModel: true,
      shotAirport: true,
      status: true,
      hot: true,
      description: true,
      shotAt: true,
      reviewReason: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!photo || photo.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ photo });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!photo || photo.userId !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (photo.status === "rejected") return NextResponse.json({ error: "rejected_not_deletable" }, { status: 403 });

  await prisma.photo.delete({ where: { id } });
  await deletePhotoUploadDir(id);
  return NextResponse.json({ ok: true });
}
