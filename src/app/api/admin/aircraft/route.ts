import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

function parseKeywords(params: {
  keywords: string | null | undefined;
  registration: string;
  aircraftModel: string | null;
  airline: string | null;
  msn: string | null;
}) {
  const raw = String(params.keywords ?? "");
  const parts = raw
    .split(/[,，、\n\r\t ]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const base = [params.registration, params.aircraftModel, params.airline, params.msn].filter(Boolean) as string[];
  const all = [...base, ...parts]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const uniq = Array.from(new Set(all));
  return uniq.length ? JSON.stringify(uniq) : null;
}

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const qRaw = (searchParams.get("query") ?? "").trim();
  const q = qRaw.toUpperCase();
  const qLower = qRaw.toLowerCase();
  const sortRaw = (searchParams.get("sort") ?? "").trim().toLowerCase();
  const dirRaw = (searchParams.get("dir") ?? "").trim().toLowerCase();
  const dir: "asc" | "desc" = dirRaw === "asc" ? "asc" : "desc";

  const orderBy: any[] =
    sortRaw === "registration"
      ? [{ registration: dir }, { updatedAt: "desc" }]
      : sortRaw === "aircraftmodel"
        ? [{ aircraftModel: dir }, { registration: "asc" }]
        : sortRaw === "airline"
          ? [{ airline: dir }, { registration: "asc" }]
          : sortRaw === "msn"
            ? [{ msn: dir }, { registration: "asc" }]
            : [{ updatedAt: dir }, { registration: "asc" }];

  const rows = await prisma.aircraftRegistration.findMany({
    where: q
      ? {
          OR: [
            { registration: { contains: q } },
            { aircraftModel: { contains: qRaw } },
            { airline: { contains: qRaw } },
            { msn: { contains: qRaw } },
            { keywordsJson: { contains: JSON.stringify(qLower) } },
          ],
        }
      : undefined,
    orderBy,
    take: 200,
    select: {
      registration: true,
      aircraftModel: true,
      airline: true,
      msn: true,
      updatedAt: true,
      updatedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ results: rows });
}

export async function POST(request: Request) {
  const { user } = await requireAdmin();
  const body = (await request.json().catch(() => ({}))) as {
    registration?: string;
    aircraftModel?: string | null;
    airline?: string | null;
    msn?: string | null;
    keywords?: string | null;
  };

  const registration = (body.registration ?? "").trim().toUpperCase();
  if (!registration) return NextResponse.json({ error: "registration required" }, { status: 400 });

  const aircraftModel = typeof body.aircraftModel === "string" ? body.aircraftModel.trim() || null : body.aircraftModel ?? null;
  const airline = typeof body.airline === "string" ? body.airline.trim() || null : body.airline ?? null;
  const msn = typeof body.msn === "string" ? body.msn.trim() || null : body.msn ?? null;
  const keywordsJson = parseKeywords({ keywords: body.keywords, registration, aircraftModel, airline, msn });

  const row = await prisma.aircraftRegistration.upsert({
    where: { registration },
    create: { registration, aircraftModel, airline, msn, keywordsJson, updatedById: user.id },
    update: { aircraftModel, airline, msn, keywordsJson, updatedById: user.id },
    select: { registration: true, aircraftModel: true, airline: true, msn: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, row });
}

