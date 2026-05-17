import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

function parseKeywords(params: {
  keywords: string | null | undefined;
  iata: string | null;
  icao: string | null;
  nameZh: string;
  nameEn: string;
}) {
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

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const airport = await prisma.airport.findUnique({ where: { id } });
  if (!airport) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ airport });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = (await request.json()) as Partial<{
    iata: string | null;
    icao: string | null;
    nameZh: string;
    nameEn: string;
    keywords: string | null;
    intro: string | null;
    factsJson: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    timezone: string | null;
    openedOn: string | null;
    category: string | null;
    nature: string | null;
    elevationM: number | null;
    lat: number | null;
    lon: number | null;
    terminalsJson: string | null;
    airlinesJson: string | null;
    trafficJson: string | null;
    runwaysJson: string | null;
    photosJson: string | null;
    taxiwayPhotosJson: string | null;
    notes: string | null;
  }>;

  const nameZh = (body.nameZh ?? "").trim();
  const nameEn = (body.nameEn ?? "").trim();
  const iata = (body.iata ?? null) ? String(body.iata).trim().toUpperCase() : null;
  const icao = (body.icao ?? null) ? String(body.icao).trim().toUpperCase() : null;
  const keywordsJson = parseKeywords({ keywords: body.keywords, iata, icao, nameZh, nameEn });

  if (!nameZh || !nameEn) {
    return NextResponse.json({ error: "nameZh/nameEn required" }, { status: 400 });
  }
  if (!iata && !icao) {
    return NextResponse.json({ error: "iata or icao required" }, { status: 400 });
  }

  const updated = await prisma.airport.update({
    where: { id },
    data: {
      iata,
      icao,
      nameZh,
      nameEn,
      keywordsJson,
      intro: body.intro ?? null,
      factsJson: body.factsJson ?? null,
      city: body.city ?? null,
      province: body.province ?? null,
      country: body.country ?? null,
      timezone: body.timezone ?? null,
      openedOn: body.openedOn ?? null,
      category: body.category ?? null,
      nature: body.nature ?? null,
      elevationM: typeof body.elevationM === "number" ? body.elevationM : null,
      lat: typeof body.lat === "number" ? body.lat : null,
      lon: typeof body.lon === "number" ? body.lon : null,
      terminalsJson: body.terminalsJson ?? null,
      airlinesJson: body.airlinesJson ?? null,
      trafficJson: body.trafficJson ?? null,
      runwaysJson: body.runwaysJson ?? null,
      photosJson: body.photosJson ?? null,
      taxiwayPhotosJson: body.taxiwayPhotosJson ?? null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ airport: updated });
}

