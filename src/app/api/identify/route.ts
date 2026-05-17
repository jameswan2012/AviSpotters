import { NextResponse } from "next/server";
import { buildModelPage, listIndex } from "@/models/data";

export const runtime = "nodejs";

type IdentifyResult = {
  manufacturer: string;
  family: string;
  model: string;
  confidence: number;
  thumbnailUrl?: string;
  modelPage: string;
};

function nowMs() {
  return Date.now();
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function scoreByKeywords(text: string) {
  const q = normalize(text);
  const index = listIndex();

  const scored = index
    .map((it) => {
      const keys = [it.name, it.modelId, it.familyId, it.manufacturerId, it.slug, ...(it.keywords ?? [])];
      const hay = keys.map((k) => normalize(String(k))).join(" | ");

      let score = 0;
      for (const k of keys) {
        const kk = normalize(String(k));
        if (!kk) continue;
        if (q === kk) score += 12;
        if (q.includes(kk) || kk.includes(q)) score += 4;
      }
      if (hay.includes(q)) score += 3;
      return { it, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ it, score }, rank) => {
      // Convert score to a soft confidence.
      const base = Math.min(0.92, 0.45 + score / 30);
      const confidence = Math.max(0.05, base - rank * 0.07);
      const result: IdentifyResult = {
        manufacturer: it.manufacturerId,
        family: it.familyId,
        model: it.modelId,
        confidence,
        thumbnailUrl: it.thumbnailUrl,
        modelPage: buildModelPage(it.manufacturerId, it.familyId, it.modelId),
      };
      return result;
    });

  return scored;
}

async function extractInputText(request: Request): Promise<{ kind: "file" | "url"; hint: string } | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("image");
    if (file && typeof file === "object" && "name" in file) {
      // Fallback path: use filename as a hint.
      const name = String((file as File).name ?? "");
      return { kind: "file", hint: name };
    }
    return null;
  }

  const body = (await request.json().catch(() => null)) as { image_url?: string } | null;
  const url = body?.image_url;
  if (!url || typeof url !== "string") return null;
  return { kind: "url", hint: url };
}

export async function POST(request: Request) {
  const started = nowMs();
  const input = await extractInputText(request.clone());
  if (!input) {
    return NextResponse.json({ error: "請提供 image（檔案）或 image_url（網址）" }, { status: 422 });
  }

  // Heuristic keyword match using filename/url hint
  const results = scoreByKeywords(input.hint);

  if (!results.length) {
    return NextResponse.json({
      inputId: crypto.randomUUID(),
      results: [],
      suggestedCrop: null,
      processingTimeMs: nowMs() - started,
      notes:
        "目前會使用檔名/網址作關鍵字推測。你可以改用 /api/models 搜尋或直接瀏覽機型頁。",
    });
  }

  return NextResponse.json({
    inputId: crypto.randomUUID(),
    results,
    suggestedCrop: null,
    processingTimeMs: nowMs() - started,
    notes:
      "提示：目前結果為關鍵字推測（檔名/網址）。",
  });
}

