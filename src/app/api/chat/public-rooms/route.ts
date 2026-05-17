import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const meRoleId = toRoleId(user.roleId);
  if (meRoleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rooms = await prisma.chatRoom.findMany({
    where: {
      type: "public",
      ...(meRoleId >= 4 ? {} : { id: { not: "superadmins" } }),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, type: true, name: true, updatedAt: true },
  });

  return NextResponse.json({ rooms });
}

