import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";

export async function GET(request: Request) {
  await requireStaff();
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "open").trim();
  const targetType = (searchParams.get("targetType") ?? "").trim();

  const reports = await prisma.correctionReport.findMany({
    where: {
      status: status || "open",
      ...(targetType ? { targetType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 160,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      status: true,
      message: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ reports });
}

