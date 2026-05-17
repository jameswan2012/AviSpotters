import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

function parseKeywords(params: { keywords: string | null | undefined; iata: string | null; icao: string | null; nameZh: string | null; nameEn: string | null }) {
  const raw = String(params.keywords ?? "");
  const parts = raw
    .split(/[,，、\n\r\t ]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const base = [params.iata, params.icao, params.nameZh, params.nameEn].filter(Boolean) as string[];
  const all = [...base, ...parts]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const uniq = Array.from(new Set(all));
  return uniq.length ? JSON.stringify(uniq) : null;
}

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("query") ?? "").trim();
  const take = Math.max(1, Math.min(200, Number(searchParams.get("take") ?? "200") || 200));

  const rows = await prisma.airline.findMany({
    where: q
      ? {
          OR: [
            { iata: { contains: q.toUpperCase() } },
            { icao: { contains: q.toUpperCase() } },
            { nameZh: { contains: q } },
            { nameEn: { contains: q } },
            { keywordsJson: { contains: JSON.stringify(q.trim().toLowerCase()) } },
          ],
        }
      : undefined,
    orderBy: [{ updatedAt: "desc" }],
    take,
  });

  return NextResponse.json({ airlines: rows });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as Partial<{
    action: "bulk_import" | null;
    id: string | null;
    iata: string | null;
    icao: string | null;
    nameZh: string | null;
    nameEn: string | null;
    keywords: string | null;
    notes: string | null;
    rowsText: string | null;
  }>;

  if (body.action === "bulk_import") {
    const rowsText = String(body.rowsText ?? "");
    const lines = rowsText
      .split(/\r?\n/g)
      .map((x) => x.trim())
      .filter((x) => x && !x.startsWith("#"));
    if (!lines.length) return NextResponse.json({ error: "请先输入导入内容" }, { status: 400 });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx]!;
      const parts = line.split("*").map((x) => x.trim());
      if (parts.length < 4) {
        skipped++;
        errors.push(`L${idx + 1}: 格式错误（需 中文*英文*IATA*ICAO*关键词）`);
        continue;
      }
      const [nameZhRaw, nameEnRaw, iataRaw, icaoRaw, keywordsRaw = ""] = parts;
      const nameZh = nameZhRaw || null;
      const nameEn = nameEnRaw || null;
      const iata = iataRaw ? iataRaw.toUpperCase() : null;
      const icao = icaoRaw ? icaoRaw.toUpperCase() : null;
      const keywordsJson = parseKeywords({ keywords: keywordsRaw || null, iata, icao, nameZh, nameEn });
      if (!nameZh && !nameEn && !iata && !icao) {
        skipped++;
        continue;
      }
      try {
        if (iata) {
          await prisma.airline.upsert({
            where: { iata },
            create: { iata, icao, nameZh, nameEn, keywordsJson, notes: null },
            update: { icao, nameZh, nameEn, keywordsJson },
          });
        } else if (icao) {
          await prisma.airline.upsert({
            where: { icao },
            create: { iata: null, icao, nameZh, nameEn, keywordsJson, notes: null },
            update: { nameZh, nameEn, keywordsJson },
          });
        } else {
          await prisma.airline.create({ data: { iata: null, icao: null, nameZh, nameEn, keywordsJson, notes: null } });
        }
        imported++;
      } catch (e) {
        skipped++;
        errors.push(`L${idx + 1}: ${e instanceof Error ? e.message : "保存失败"}`);
      }
    }

    return NextResponse.json({ ok: true, imported, skipped, errors: errors.slice(0, 20) });
  }

  const iata = (body.iata ?? null) ? String(body.iata).trim().toUpperCase() : null;
  const icao = (body.icao ?? null) ? String(body.icao).trim().toUpperCase() : null;
  const nameZh = (body.nameZh ?? null) ? String(body.nameZh).trim() : null;
  const nameEn = (body.nameEn ?? null) ? String(body.nameEn).trim() : null;
  const notes = (body.notes ?? null) ? String(body.notes).trim() : null;
  const keywordsJson = parseKeywords({ keywords: body.keywords, iata, icao, nameZh, nameEn });

  if (!iata && !icao && !nameZh && !nameEn) {
    return NextResponse.json({ error: "至少填寫一項：IATA / ICAO / 中文名 / 英文名" }, { status: 400 });
  }

  // Upsert strategy: prefer IATA, then ICAO, else id, else create new.
  let row = null as any;
  if (iata) {
    row = await prisma.airline.upsert({
      where: { iata },
      create: { iata, icao, nameZh, nameEn, keywordsJson, notes },
      update: { icao, nameZh, nameEn, keywordsJson, notes },
    });
  } else if (icao) {
    row = await prisma.airline.upsert({
      where: { icao },
      create: { iata: null, icao, nameZh, nameEn, keywordsJson, notes },
      update: { nameZh, nameEn, keywordsJson, notes },
    });
  } else if (body.id) {
    row = await prisma.airline.update({
      where: { id: String(body.id) },
      data: { iata, icao, nameZh, nameEn, keywordsJson, notes },
    });
  } else {
    row = await prisma.airline.create({ data: { iata, icao, nameZh, nameEn, keywordsJson, notes } });
  }

  return NextResponse.json({ airline: row });
}

