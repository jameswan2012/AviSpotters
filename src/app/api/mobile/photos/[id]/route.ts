import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      registration: true,
      airline: true,
      aircraftModel: true,
      shotAirport: true,
      status: true,
      hot: true,
      description: true,
      shotAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!photo || photo.status !== "approved") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ photo });
}
