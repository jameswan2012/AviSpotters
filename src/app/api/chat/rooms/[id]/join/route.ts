import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: roomId } = await ctx.params;
  if (!roomId) return NextResponse.json({ error: "roomId_required" }, { status: 400 });

  const meRoleId = toRoleId(user.roleId);
  if (roomId === "lobby" && meRoleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (roomId === "admins" && meRoleId < 3) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (roomId === "superadmins" && meRoleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const now = new Date();
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { id: true, type: true } });
  if (!room || room.type !== "public") return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ban = await prisma.chatRoomBan.findFirst({
    where: { roomId, userId: user.id, revokedAt: null, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] },
    select: { id: true },
  });
  if (ban) return NextResponse.json({ error: "banned" }, { status: 403 });

  await prisma.chatMember.upsert({
    where: { roomId_userId: { roomId, userId: user.id } },
    create: { roomId, userId: user.id, role: "member" },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

