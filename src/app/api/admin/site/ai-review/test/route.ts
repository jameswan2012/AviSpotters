import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { getAiReviewSettingForSend } from "@/lib/site-settings";

function resolveBase(baseUrl: string) {
  const b = baseUrl.replace(/\/+$/, "");
  return /\/v1$/i.test(b) ? b : `${b}/v1`;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ai = await getAiReviewSettingForSend();
  if (!ai) return NextResponse.json({ error: "ai_not_configured" }, { status: 400 });
  const base = resolveBase(ai.baseUrl);
  const model = ai.model || "gpt-5.4";
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${ai.apiKey}`,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const checks: Record<string, any> = {};

    const modelsRes = await fetch(`${base}/models`, { signal: controller.signal, headers });
    const modelsText = await modelsRes.text();
    checks.models = modelsRes.ok
      ? { ok: true }
      : { ok: false, status: modelsRes.status, detail: modelsText.slice(0, 300) };

    const responsesRes = await fetch(`${base}/responses`, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        input: [{ role: "user", content: [{ type: "input_text", text: "Return {\"ok\":true}" }] }],
      }),
    });
    const responsesText = await responsesRes.text();
    checks.responses = responsesRes.ok
      ? { ok: true }
      : { ok: false, status: responsesRes.status, detail: responsesText.slice(0, 300) };

    const chatRes = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        temperature: 0,
        stream: false,
        messages: [{ role: "user", content: "Return {\"ok\":true}" }],
      }),
    });
    const chatText = await chatRes.text();
    checks.chat = chatRes.ok ? { ok: true } : { ok: false, status: chatRes.status, detail: chatText.slice(0, 300) };

    const ok = checks.models.ok && (checks.responses.ok || checks.chat.ok);
    return NextResponse.json({ ok, base, model, checks });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "ai_connectivity_error", detail: e instanceof Error ? `${e.name}: ${e.message}` : "unknown" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}

