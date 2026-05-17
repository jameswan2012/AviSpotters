import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { appendAiTrainingFeedback, type AiFeedbackPayload } from "@/lib/ai-training-feedback";
import { getAiTrainingSetting } from "@/lib/site-settings";

function cleanId(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function toNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cleanEvent(v: unknown): AiFeedbackPayload["event"] | null {
  if (
    v === "dust_false_positive" ||
    v === "dust_manual_positive" ||
    v === "dust_all_false_positive" ||
    v === "smart_suggestion_correct" ||
    v === "smart_suggestion_wrong"
  ) {
    return v;
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const aiTraining = await getAiTrainingSetting();
  if (!aiTraining.enabled) return NextResponse.json({ error: "ai_training_disabled" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as any;
  const photoId = cleanId(body?.photoId);
  const imageUrl = cleanId(body?.imageUrl);
  const event = cleanEvent(body?.event);
  if (!photoId || !imageUrl || !event) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const markerRaw = body?.marker;
  const source: "detected" | "manual" = markerRaw?.source === "manual" ? "manual" : "detected";
  const marker =
    markerRaw && typeof markerRaw === "object"
      ? {
          x: toNum(markerRaw.x),
          y: toNum(markerRaw.y),
          r: Math.max(1, toNum(markerRaw.r, 1)),
          source,
        }
      : undefined;

  const suggestionKey = cleanId(body?.suggestionKey) || undefined;
  const locale = cleanId(body?.locale) || undefined;
  const note = cleanId(body?.note) || undefined;

  await appendAiTrainingFeedback({
    userId: user.id,
    roleId,
    payload: { photoId, imageUrl, event, marker, suggestionKey, locale, note },
  });

  return NextResponse.json({ ok: true });
}
