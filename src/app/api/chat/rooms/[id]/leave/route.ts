import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: roomId } = await ctx.params;
  if (!roomId) return NextResponse.json({ error: "roomId_required" }, { status: 400 });

  // Lobby cannot be left.
  if (roomId === "lobby") return NextResponse.json({ ok: true });

  await prisma.chatMember.deleteMany({ where: { roomId, userId: user.id } });
  return NextResponse.json({ ok: true });
}

