import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.aircraftRegistrationSubmission.findMany({
    where: { submittedById: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, registration: true, aircraftModel: true, airline: true, msn: true, status: true, createdAt: true, reviewedAt: true },
  });

  return NextResponse.json({ results: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.roleId < 1) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    registration?: string;
    aircraftModel?: string | null;
    airline?: string | null;
    msn?: string | null;
    note?: string | null;
  };

  const registration = (body.registration ?? "").trim().toUpperCase();
  if (!registration) return NextResponse.json({ error: "registration required" }, { status: 400 });

  const aircraftModel = typeof body.aircraftModel === "string" ? body.aircraftModel.trim() || null : body.aircraftModel ?? null;
  const airline = typeof body.airline === "string" ? body.airline.trim() || null : body.airline ?? null;
  const msn = typeof body.msn === "string" ? body.msn.trim() || null : body.msn ?? null;
  const note = typeof body.note === "string" ? body.note.trim() || null : body.note ?? null;

  const row = await prisma.aircraftRegistrationSubmission.create({
    data: { registration, aircraftModel, airline, msn, note, status: "pending", submittedById: user.id },
    select: { id: true, registration: true, aircraftModel: true, airline: true, msn: true, status: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, row });
}

