import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { SYS_NOTIFY_PREFIX } from "@/lib/user-notifications";

export async function GET() {
  await requireAdmin();
  const rows = await prisma.ticket.findMany({
    where: {
      AND: [
        { body: { not: { startsWith: SYS_NOTIFY_PREFIX } } },
        { body: { not: { startsWith: "[[MODERATION_INCIDENT]]" } } },
        { email: { notIn: ["system@avispotters.local", "__system_moderation__@local"] } },
      ],
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    select: {
      id: true,
      email: true,
      body: true,
      status: true,
      staffReply: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ tickets: rows });
}

export async function POST(request: Request) {
  const { user } = await requireAdmin();
  const body = (await request.json().catch(() => ({}))) as Partial<{ id: string; staffReply: string; close: boolean }>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const staffReply = typeof body.staffReply === "string" ? body.staffReply.trim() : "";
  if (staffReply.length > 5000) return NextResponse.json({ error: "回覆太長（最多 5000 字）" }, { status: 400 });
  const close = body.close === true;

  const now = new Date();
  await prisma.ticket.update({
    where: { id },
    data: {
      staffReply: staffReply || null,
      status: close ? "closed" : "open",
      resolvedById: close ? user.id : null,
      resolvedAt: close ? now : null,
      updatedAt: now,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true });
}

