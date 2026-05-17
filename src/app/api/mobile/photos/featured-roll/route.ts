import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const takeRaw = Number(searchParams.get("take") ?? "12");
  const take = Number.isFinite(takeRaw) ? Math.max(3, Math.min(30, Math.floor(takeRaw))) : 12;

  const rows = await prisma.photo.findMany({
    where: { status: "approved", featured: true },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      title: true,
      registration: true,
      airline: true,
      aircraftModel: true,
      shotAirport: true,
      status: true,
      hot: true,
    },
  });

  return NextResponse.json({ photos: rows });
}

