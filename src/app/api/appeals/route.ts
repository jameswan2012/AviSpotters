import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const appeals = await prisma.appeal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      message: true,
      staffReply: true,
      createdAt: true,
      reviewedAt: true,
      photo: { select: { id: true, registration: true, title: true, status: true } },
    },
  });

  return NextResponse.json({ appeals });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { photoId?: string; message?: string };
  const photoId = typeof body.photoId === "string" ? body.photoId.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!photoId || !message) return NextResponse.json({ error: "photoId/message required" }, { status: 400 });
  if (message.length < 6) return NextResponse.json({ error: "message too short" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "message too long" }, { status: 400 });

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, userId: true, status: true },
  });
  if (!photo || photo.userId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (photo.status !== "rejected") return NextResponse.json({ error: "only rejected photos can be appealed" }, { status: 400 });

  const exists = await prisma.appeal.findFirst({ where: { photoId, userId: user.id, status: "open" }, select: { id: true } });
  if (exists) return NextResponse.json({ error: "appeal already open" }, { status: 409 });

  const appeal = await prisma.appeal.create({
    data: { photoId, userId: user.id, message, status: "open" },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, appealId: appeal.id });
}

