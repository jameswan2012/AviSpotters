import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAiReviewSettingForSend } from "@/lib/site-settings";
import { buildAiReviewPrompt, aiReviewResultKey, loadOriginalImageDataUrl, normalizeAiPhotoReview } from "@/lib/ai-photo-review";

function parseCategories(raw: string | null) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function loadViewer() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, roleId: true } });
  return user;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await loadViewer();
  if (!viewer || viewer.roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const ai = await getAiReviewSettingForSend();
  const allowUploaderSelfUse = ai?.allowUploaderSelfUse === true;
  const photo = await prisma.photo.findUnique({ where: { id }, select: { userId: true, status: true } });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowUploaderSelfUse && photo.userId === viewer.id) return NextResponse.json({ error: "uploader_cannot_use" }, { status: 403 });
  if (photo.status !== "pending") return NextResponse.json({ error: "only_pending_in_queue" }, { status: 403 });
  const row = await (prisma as any).siteSetting.findUnique({ where: { key: aiReviewResultKey(id) } });
  if (!row?.valueJson) return NextResponse.json({ result: null, exists: false });
  try {
    return NextResponse.json({ result: JSON.parse(row.valueJson), exists: true });
  } catch {
    return NextResponse.json({ result: null, exists: false });
  }
}

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await loadViewer();
  if (!viewer || viewer.roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const key = aiReviewResultKey(id);
  const existing = await (prisma as any).siteSetting.findUnique({ where: { key } });
  if (existing?.valueJson) {
    try {
      return NextResponse.json({ ok: true, existing: true, result: JSON.parse(existing.valueJson) });
    } catch {
      // continue to regenerate only if stored payload is broken
    }
  }

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      userId: true,
      title: true,
      description: true,
      registration: true,
      airline: true,
      aircraftModel: true,
      shotAirport: true,
      shotAt: true,
      serialNumber: true,
      msn: true,
      originalPath: true,
      originalMime: true,
      categoriesJson: true,
    },
  });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (photo.status !== "pending") return NextResponse.json({ error: "only_pending_in_queue" }, { status: 403 });

  const ai = await getAiReviewSettingForSend();
  if (!ai) return NextResponse.json({ error: "ai_not_configured" }, { status: 400 });
  const allowUploaderSelfUse = ai.allowUploaderSelfUse === true;
  if (!allowUploaderSelfUse && photo.userId === viewer.id) return NextResponse.json({ error: "uploader_cannot_use" }, { status: 403 });

  let imageDataUrl = "";
  try {
    imageDataUrl = await loadOriginalImageDataUrl({ originalPath: photo.originalPath, originalMime: photo.originalMime || "image/jpeg" });
  } catch {
    return NextResponse.json({ error: "original_file_missing" }, { status: 404 });
  }

  const prompt = buildAiReviewPrompt({
    photoId: photo.id,
    registration: photo.registration,
    airline: photo.airline,
    aircraftModel: photo.aircraftModel,
    shotAirport: photo.shotAirport,
    shotAt: photo.shotAt,
    title: photo.title,
    description: photo.description,
    serialNumber: photo.serialNumber,
    msn: photo.msn,
    categories: parseCategories(photo.categoriesJson),
  });

  const base = (() => {
    const b = ai.baseUrl.replace(/\/+$/, "");
    return /\/v1$/i.test(b) ? b : `${b}/v1`;
  })();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  let rawText = "";
  try {
    const commonHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${ai.apiKey}`,
    };

    // 1) Prefer Responses API (newer model gateways)
    const res1 = await fetch(`${base}/responses`, {
      method: "POST",
      signal: controller.signal,
      headers: commonHeaders,
      body: JSON.stringify({
        model: ai.model || "gpt-5.4",
        temperature: 0.1,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageDataUrl },
            ],
          },
        ],
      }),
    });
    const text1 = await res1.text();
    if (res1.ok) {
      let json1: any = null;
      try {
        json1 = JSON.parse(text1);
      } catch {
        rawText = text1;
      }
      if (!rawText) {
        const outputText =
          json1?.output_text ||
          (Array.isArray(json1?.output)
            ? json1.output
                .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
                .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
                .join("\n")
            : "");
        rawText = String(outputText || "").trim() || text1;
      }
    } else {
      // 2) Fallback to chat/completions (OpenAI-compatible classic)
      const res2 = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: commonHeaders,
        body: JSON.stringify({
          model: ai.model || "gpt-5.4",
          temperature: 0.1,
          stream: false,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "你是航空图片质量审核机器人，只返回 JSON。" },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
        }),
      });
      const text2 = await res2.text();
      if (!res2.ok) {
        return NextResponse.json(
          { error: "ai_request_failed", detail: `responses: ${text1.slice(0, 320)} | chat: ${text2.slice(0, 320)}` },
          { status: 502 }
        );
      }
      let json2: any = null;
      try {
        json2 = JSON.parse(text2);
      } catch {
        rawText = text2;
      }
      if (!rawText) {
        rawText = String(json2?.choices?.[0]?.message?.content || json2?.output_text || "").trim() || text2;
      }
    }
  } catch (e) {
    return NextResponse.json(
      {
        error: "ai_request_error",
        detail: e instanceof Error ? `${e.name}: ${e.message}` : "unknown",
        base,
        model: ai.model || "gpt-5.4",
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }

  const normalized = normalizeAiPhotoReview(rawText);
  const result = {
    source: "robot",
    model: ai.model || "gpt-5.4",
    analyzedAt: new Date().toISOString(),
    analyzedById: viewer.id,
    photoId: photo.id,
    result: normalized,
  };

  await (prisma as any).siteSetting.upsert({
    where: { key },
    create: { key, valueJson: JSON.stringify(result), updatedById: viewer.id },
    update: { valueJson: JSON.stringify(result), updatedById: viewer.id },
  });

  return NextResponse.json({ ok: true, existing: false, result });
}
