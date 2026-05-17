import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") || "").toLowerCase();
  const statusFilter = status === "approved" || status === "rejected" || status === "pending" ? status : null;

  const rows = await prisma.photo.findMany({
    where: statusFilter ? { userId: user.id, status: statusFilter } : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      title: true,
      registration: true,
      airline: true,
      aircraftModel: true,
      shotAirport: true,
      hot: true,
    },
  });

  return NextResponse.json({ photos: rows });
}
