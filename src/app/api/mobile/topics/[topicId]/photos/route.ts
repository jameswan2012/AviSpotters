import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request, ctx: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;
  const token = `"${String(topicId || "").trim()}"`;

  const where = {
    status: "approved",
    categoriesJson: { contains: token },
  } as const;

  const [total, rows] = await Promise.all([
    prisma.photo.count({ where }),
    prisma.photo.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
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
    }),
  ]);

  return NextResponse.json({
    topicId,
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
    photos: rows,
  });
}

