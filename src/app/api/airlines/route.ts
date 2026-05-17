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

  const rows = await prisma.airline.findMany({
    where: {
      OR: [
        { iata: { contains: queryRaw.toUpperCase() } },
        { icao: { contains: queryRaw.toUpperCase() } },
        { nameZh: { contains: queryRaw } },
        { nameEn: { contains: queryRaw } },
        { keywordsJson: { contains: JSON.stringify(query) } },
      ],
    },
    orderBy: [{ iata: "asc" }, { icao: "asc" }, { nameEn: "asc" }],
    take: limit,
    select: { id: true, iata: true, icao: true, nameZh: true, nameEn: true },
  });

  const results = rows.map((r) => {
    const code = r.iata ?? r.icao ?? "";
    const name = r.nameZh ?? r.nameEn ?? code;
    return { id: r.id, code, iata: r.iata, icao: r.icao, nameZh: r.nameZh, nameEn: r.nameEn, label: name };
  });

  const boosted = results.sort((a, b) => {
    const aq = normalize(a.code) === query ? 1 : 0;
    const bq = normalize(b.code) === query ? 1 : 0;
    return bq - aq;
  });

  return NextResponse.json({ query, results: boosted });
}

