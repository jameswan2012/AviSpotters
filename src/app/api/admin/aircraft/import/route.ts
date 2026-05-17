import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

function parseLines(text: string) {
  const raw = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = raw.split("\n");
  const out: Array<{ airline: string; registration: string; aircraftModel: string; line: number }> = [];
  const errors: Array<{ line: number; error: string; raw: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const s = (lines[i] ?? "").trim();
    if (!s) continue;
    if (s.startsWith("#")) continue;

    // Format: airline*registration*model (one column). Support fullwidth star too.
    const parts = s.split(/[*＊]/g).map((x) => x.trim());
    if (parts.length < 3) {
      errors.push({ line: lineNo, error: "format_invalid", raw: s });
      continue;
    }
    const airline = parts[0] ?? "";
    const registration = (parts[1] ?? "").toUpperCase();
    const aircraftModel = parts.slice(2).join("*").trim();

    if (!airline || !registration || !aircraftModel) {
      errors.push({ line: lineNo, error: "missing_field", raw: s });
      continue;
    }
    out.push({ airline, registration, aircraftModel, line: lineNo });
  }

  // de-dupe by registration (last line wins)
  const map = new Map<string, { airline: string; registration: string; aircraftModel: string; line: number }>();
  for (const r of out) map.set(r.registration, r);
  const deduped = Array.from(map.values());

  return { rows: deduped, errors };
}

function buildKeywordsJson(registration: string, airline: string, aircraftModel: string) {
  const base = [registration, airline, aircraftModel]
    .map((s) => String(s || "").trim().toLowerCase())
    .filter(Boolean);
  const uniq = Array.from(new Set(base));
  return uniq.length ? JSON.stringify(uniq) : null;
}

export async function POST(request: Request) {
  const { user } = await requireSuperAdmin();
  const body = (await request.json().catch(() => ({}))) as { text?: string };
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (text.length > 1_000_000) return NextResponse.json({ error: "too_large" }, { status: 400 });

  const { rows, errors } = parseLines(text);
  if (!rows.length) return NextResponse.json({ ok: false, created: 0, updated: 0, errors }, { status: 200 });
  if (rows.length > 5000) return NextResponse.json({ error: "too_many_rows" }, { status: 400 });

  // Find which registrations already exist to compute created/updated counts.
  const existing = new Set<string>();
  const regs = rows.map((r) => r.registration);
  const chunkSize = 500;
  for (let i = 0; i < regs.length; i += chunkSize) {
    const chunk = regs.slice(i, i + chunkSize);
    const hits = await prisma.aircraftRegistration.findMany({
      where: { registration: { in: chunk } },
      select: { registration: true },
    });
    for (const h of hits) existing.add(h.registration);
  }

  let created = 0;
  let updated = 0;

  // Upsert in a single transaction (SQLite can handle this size).
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      const keywordsJson = buildKeywordsJson(r.registration, r.airline, r.aircraftModel);
      const isExisting = existing.has(r.registration);
      await tx.aircraftRegistration.upsert({
        where: { registration: r.registration },
        create: {
          registration: r.registration,
          airline: r.airline,
          aircraftModel: r.aircraftModel,
          msn: null,
          keywordsJson,
          updatedById: user.id,
        },
        update: {
          airline: r.airline,
          aircraftModel: r.aircraftModel,
          keywordsJson,
          updatedById: user.id,
        },
      });
      if (isExisting) updated++;
      else created++;
    }
  });

  return NextResponse.json({ ok: true, created, updated, errors });
}

