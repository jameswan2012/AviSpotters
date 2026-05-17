import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const takeRaw = Number(searchParams.get("take") ?? "10");
  const take = Number.isFinite(takeRaw) ? Math.max(3, Math.min(20, Math.floor(takeRaw))) : 10;

  const rows = await prisma.photo.findMany({
    where: { status: "approved", featured: true },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      registration: true,
      title: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    photos: rows.map((p) => ({
      id: p.id,
      registration: p.registration,
      title: p.title,
      author: {
        id: p.user.id,
        name: p.user.name ?? p.user.email,
      },
    })),
  });
}

