import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const memberships = await prisma.chatMember.findMany({
    where: { userId: session.userId },
    select: {
      room: {
        select: {
          id: true,
          type: true,
          name: true,
          members: {
            select: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = memberships
    .map((m) => m.room)
    .filter((r) => r.type !== "direct")
    .map((r) => ({ id: r.id, name: r.name || "Group" }));

  const privateTargetsMap = new Map<string, { id: string; name: string }>();
  for (const row of memberships) {
    const room = row.room;
    if (room.type !== "direct") continue;
    const other = room.members.map((m) => m.user).find((u) => u.id !== session.userId);
    if (!other) continue;
    const name = (other.name || other.email || "").trim() || other.id;
    privateTargetsMap.set(other.id, { id: other.id, name });
  }

  return NextResponse.json({
    privateTargets: Array.from(privateTargetsMap.values()),
    groups,
  });
}

