import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;
  const now = new Date();

  const where: Prisma.NewsWhereInput = {
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };

  const [total, rows] = await Promise.all([
    prisma.news.count({ where }),
    prisma.news.findMany({
      where,
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        imageUrl: true,
        imagePath: true,
        imageUpdatedAt: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    }),
  ]);

  const news = rows.map((row) => {
    const hasUpload = !!row.imagePath;
    const v = row.imageUpdatedAt ? new Date(row.imageUpdatedAt).getTime() : 0;
    const imageUrl = hasUpload ? `/api/news/${encodeURIComponent(row.id)}/image?v=${v}` : row.imageUrl ?? null;
    return {
      id: row.id,
      title: row.title,
      body: row.body ?? null,
      imageUrl,
      startsAt: row.startsAt ? row.startsAt.toISOString() : null,
      endsAt: row.endsAt ? row.endsAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    page,
    limit,
    total,
    hasMore: skip + news.length < total,
    news,
  });
}

