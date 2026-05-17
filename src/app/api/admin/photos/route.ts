import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toRoleId } from "@/lib/roles";

async function requireStaff() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, roleId: true, name: true, email: true } });
  if (!user) return null;
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return null;
  return { user, roleId };
}

export async function GET(request: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "pending").trim();
  const q = (searchParams.get("q") ?? "").trim();

  const rows = await prisma.photo.findMany({
    where: {
      status,
      ...(q
        ? {
            OR: [
              { registration: { contains: q } },
              { shotAirport: { contains: q } },
              { aircraftModel: { contains: q } },
              { airline: { contains: q } },
              { title: { contains: q } },
              { user: { is: { email: { contains: q } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: 80,
    select: {
      id: true,
      status: true,
      registration: true,
      aircraftModel: true,
      airline: true,
      shotAirport: true,
      shotAt: true,
      title: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ photos: rows });
}

