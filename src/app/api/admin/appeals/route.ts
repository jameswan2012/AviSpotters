import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";

export async function GET(request: Request) {
  await requireStaff();
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "open").trim();

  const appeals = await prisma.appeal.findMany({
    where: { status: status || "open" },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: {
      id: true,
      status: true,
      message: true,
      staffReply: true,
      createdAt: true,
      photo: { select: { id: true, registration: true, title: true, status: true, user: { select: { id: true, email: true, name: true } } } },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ appeals });
}

