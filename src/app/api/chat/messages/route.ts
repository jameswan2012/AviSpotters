import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";
import { getClientIpFromHeaders } from "@/lib/ip";
import { createLowRiskIncident, enforceHighRiskAction, getModerationConfig, matchModeration } from "@/lib/moderation";

export async function POST(req: Request) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "content_type_invalid" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any = null;
  try {
    body = (await req.json()) as any;
  } catch {
    body = null;
  }
  {
    const allowedKeys = new Set(["roomId", "body"]);
    const extra = Object.keys((body || {}) as Record<string, unknown>).filter((k) => !allowedKeys.has(k));
    if (extra.length) return NextResponse.json({ error: "unexpected_parameters" }, { status: 400 });
  }
  const roomId = String(body?.roomId ?? "").trim();
  const text = String(body?.body ?? "").trim();
  if (!roomId || !text) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "too_long" }, { status: 400 });

  const moderation = await getModerationConfig();
  const ip = getClientIpFromHeaders(req.headers);
  const hit = matchModeration(text, moderation);
  if (hit.level === "high") {
    await enforceHighRiskAction({
      userId: user.id,
      ip,
      source: "chat_message",
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
      source: "chat_message",
      text,
      matches: hit.matches,
    });
    return NextResponse.json({ ok: true, moderatedDeleted: true });
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const [member, ban] = await Promise.all([
      tx.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      select: { mutedUntil: true },
      }),
      tx.chatRoomBan.findFirst({
        where: {
          roomId,
          userId: user.id,
          revokedAt: null,
          OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
        },
        select: { id: true },
      }),
    ]);
    if (!member) return { ok: false as const, status: 403, error: "forbidden" };
    if (ban) return { ok: false as const, status: 403, error: "banned" };
    if (member.mutedUntil && member.mutedUntil > now) return { ok: false as const, status: 403, error: "muted" };

    const message = await tx.chatMessage.create({
      data: { roomId, userId: user.id, kind: "text", body: text, attachmentsJson: null },
      select: {
        id: true,
        kind: true,
        body: true,
        attachmentsJson: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, roleId: true, avatarUpdatedAt: true } },
      },
    });

    await tx.chatMember.update({
      where: { roomId_userId: { roomId, userId: user.id } },
      data: { lastReadAt: now },
    });

    // Bump room activity for ordering.
    await tx.chatRoom.update({ where: { id: roomId }, data: { updatedAt: now } });

    return { ok: true as const, message };
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, message: result.message });
}

