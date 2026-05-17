import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";

export async function GET(request: Request) {
  await requireStaff();
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "pending").trim().toLowerCase();
  const s = status === "approved" || status === "rejected" || status === "pending" ? status : "pending";

  const rows = await prisma.aircraftRegistrationSubmission.findMany({
    where: { status: s },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      registration: true,
      aircraftModel: true,
      airline: true,
      msn: true,
      note: true,
      status: true,
      createdAt: true,
      submittedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      reviewedAt: true,
    },
  });

  return NextResponse.json({ results: rows });
}

export async function POST(request: Request) {
  const { user } = await requireStaff();
  const body = (await request.json().catch(() => ({}))) as { id?: string; action?: "approve" | "reject"; staffNote?: string };
  const id = String(body.id ?? "").trim();
  const action = body.action ?? null;
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const row = await prisma.aircraftRegistrationSubmission.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.status !== "pending") return NextResponse.json({ error: "already reviewed" }, { status: 409 });

  const now = new Date();

  if (action === "approve") {
    await prisma.$transaction(async (tx) => {
      await tx.aircraftRegistration.upsert({
        where: { registration: row.registration },
        create: {
          registration: row.registration,
          aircraftModel: row.aircraftModel ?? null,
          airline: row.airline ?? null,
          msn: row.msn ?? null,
          updatedById: user.id,
        },
        update: {
          aircraftModel: row.aircraftModel ?? undefined,
          airline: row.airline ?? undefined,
          msn: row.msn ?? undefined,
          updatedById: user.id,
        },
      });
      await tx.aircraftRegistrationSubmission.update({
        where: { id },
        data: { status: "approved", reviewedById: user.id, reviewedAt: now },
      });
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.aircraftRegistrationSubmission.update({
    where: { id },
    data: { status: "rejected", reviewedById: user.id, reviewedAt: now, note: (body.staffNote ?? row.note ?? null) ? String(body.staffNote ?? row.note) : null },
  });
  return NextResponse.json({ ok: true });
}

