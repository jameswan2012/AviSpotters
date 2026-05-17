import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(me.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      id: { not: me.id },
      OR: [{ email: { contains: q } }, { name: { contains: q } }],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 10,
    select: { id: true, name: true, email: true, roleId: true, avatarUpdatedAt: true },
  });

  return NextResponse.json({ users });
}

