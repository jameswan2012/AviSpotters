import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

function isStaff(roleId: number) {
  return toRoleId(roleId) >= 4;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(me.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: roomId } = await ctx.params;
  if (!roomId) return NextResponse.json({ error: "roomId_required" }, { status: 400 });

  const myMember = await prisma.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { role: true },
  });
  if (!myMember) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const members = await prisma.chatMember.findMany({
    where: { roomId },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: {
      role: true,
      mutedUntil: true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, roleId: true, avatarUpdatedAt: true, chatReadReceiptsEnabled: true } },
    },
  });

  const canModerate = isStaff(me.roleId) || myMember.role === "owner" || myMember.role === "mod";
  return NextResponse.json({ members, canModerate, myRole: myMember.role, staff: isStaff(me.roleId) });
}

