import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryRaw = searchParams.get("query") ?? "";
  const query = normalize(queryRaw);
  const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit") ?? "8") || 8));

  if (!query) {
    return NextResponse.json({ query: "", results: [] });
  }

  const rows = await prisma.airport.findMany({
    where: {
      OR: [
        { iata: { contains: queryRaw.toUpperCase() } },
        { icao: { contains: queryRaw.toUpperCase() } },
        { nameZh: { contains: queryRaw } },
        { nameEn: { contains: queryRaw } },
        { city: { contains: queryRaw } },
        { province: { contains: queryRaw } },
        { keywordsJson: { contains: JSON.stringify(query) } },
      ],
    },
    orderBy: [{ province: "asc" }, { city: "asc" }, { iata: "asc" }],
    take: limit,
    select: {
      iata: true,
      icao: true,
      nameZh: true,
      nameEn: true,
      city: true,
      province: true,
      country: true,
    },
  });

  const results = rows.map((r) => {
    const code = r.iata ?? r.icao ?? "";
    return {
      code,
      iata: r.iata,
      icao: r.icao,
      nameZh: r.nameZh,
      nameEn: r.nameEn,
      region: [r.country, r.province, r.city].filter(Boolean).join(" / "),
      airportPage: `/airports/${encodeURIComponent(code)}`,
    };
  });

  // small bump for exact code match
  const boosted = results.sort((a, b) => {
    const aq = normalize(a.code) === query ? 1 : 0;
    const bq = normalize(b.code) === query ? 1 : 0;
    return bq - aq;
  });

  return NextResponse.json({ query, results: boosted });
}

