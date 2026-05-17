import { NextResponse } from "next/server";
import { buildModelPage } from "@/models/data";
import { listIndexMerged } from "@/models/model-service";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = normalize(searchParams.get("query") ?? "");
  const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit") ?? "8") || 8));

  if (!query) {
    return NextResponse.json({ query: "", results: [] });
  }

  const index = await listIndexMerged();

  const scored = index
    .map((item) => {
      const hay = [
        item.name,
        item.modelId,
        item.familyId,
        item.manufacturerId,
        item.slug,
        ...(item.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" | ")
        .toLowerCase();

      let score = 0;
      if (hay.includes(query)) score += 5;
      if (normalize(item.modelId) === query) score += 10;
      if (normalize(item.slug) === query) score += 10;
      if ((item.keywords ?? []).some((k) => normalize(k) === query)) score += 8;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => ({
      manufacturer: item.manufacturerId,
      family: item.familyId,
      model: item.modelId,
      name: item.name,
      thumbnailUrl: item.thumbnailUrl ?? null,
      modelPage: buildModelPage(item.manufacturerId, item.familyId, item.modelId),
    }));

  return NextResponse.json({ query, results: scored });
}

