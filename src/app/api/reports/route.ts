import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const TARGET_TYPES = ["photo", "airport"] as const;
type TargetType = (typeof TARGET_TYPES)[number];

function asTargetType(v: unknown): TargetType | null {
  return typeof v === "string" && (TARGET_TYPES as readonly string[]).includes(v) ? (v as TargetType) : null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const reports = await prisma.correctionReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      status: true,
      message: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { targetType?: unknown; targetId?: unknown; message?: unknown };
  const targetType = asTargetType(body.targetType);
  const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!targetType || !targetId || !message) return NextResponse.json({ error: "targetType/targetId/message required" }, { status: 400 });
  if (message.length < 6) return NextResponse.json({ error: "message too short" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "message too long" }, { status: 400 });

  if (targetType === "photo") {
    const exists = await prisma.photo.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (targetType === "airport") {
    const exists = await prisma.airport.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const dup = await prisma.correctionReport.findFirst({
    where: { userId: user.id, targetType, targetId, status: "open" },
    select: { id: true },
  });
  if (dup) return NextResponse.json({ error: "report already open" }, { status: 409 });

  const report = await prisma.correctionReport.create({
    data: { userId: user.id, targetType, targetId, message, status: "open" },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, reportId: report.id });
}

