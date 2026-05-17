import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const photos = await prisma.photo.findMany({
    where: { userId: session.userId, status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: {
      id: true,
      title: true,
      registration: true,
      airline: true,
      aircraftModel: true,
      shotAirport: true,
      shotAt: true,
      status: true,
    },
  });

  return NextResponse.json({ photos });
}

