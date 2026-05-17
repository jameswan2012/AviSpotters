import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getServerLocaleOnly } from "@/i18n/server";
import { getClientIpFromHeaders } from "@/lib/ip";
import { createLowRiskIncident, enforceHighRiskAction, getModerationConfig, matchModeration } from "@/lib/moderation";

export async function POST(request: Request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "content_type_invalid" }, { status: 400 });
  }
  const locale = await getServerLocaleOnly();
  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: tr("尚未登入", "尚未登录", "Not signed in") }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { body?: string } | null;
  {
    const allowedKeys = new Set(["body"]);
    const extra = Object.keys((body || {}) as Record<string, unknown>).filter((k) => !allowedKeys.has(k));
    if (extra.length) return NextResponse.json({ error: tr("參數不合法", "参数不合法", "Unexpected parameters") }, { status: 400 });
  }
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: tr("請輸入訊息", "请输入消息", "Please enter a message") }, { status: 400 });

  const moderation = await getModerationConfig();
  const ip = getClientIpFromHeaders(request.headers);
  const hit = matchModeration(text, moderation);
  if (hit.level === "high") {
    await enforceHighRiskAction({
      userId: user.id,
      ip,
      source: "support_message",
      text,
      matches: hit.matches,
      config: moderation,
    });
    return NextResponse.json({ error: moderation.highLockMessage }, { status: 403 });
  }
  if (hit.level === "low") {
    await createLowRiskIncident({
      userId: user.id,
      ip,
      source: "support_message",
      text,
      matches: hit.matches,
    });
    return NextResponse.json({ ok: true, moderatedDeleted: true });
  }

  const conv = await prisma.conversation.findFirst({
    where: { userId: user.id, status: "open" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const conversationId =
    conv?.id ??
    (
      await prisma.conversation.create({
        data: { userId: user.id, status: "open" },
        select: { id: true },
      })
    ).id;

  await prisma.message.create({
    data: { conversationId, senderId: user.id, body: text },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}

