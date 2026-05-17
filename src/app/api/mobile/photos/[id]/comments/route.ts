import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getClientIpFromHeaders } from "@/lib/ip";
import { createLowRiskIncident, enforceHighRiskAction, getModerationConfig, matchModeration } from "@/lib/moderation";

async function canAccessPhoto(photo: { status: string; userId: string }, sessionUserId: string | null) {
  if (photo.status === "approved") return { ok: true, status: 200 as const };
  if (!sessionUserId) return { ok: false as const, status: 401 as const };
  if (sessionUserId === photo.userId) return { ok: true, status: 200 as const };
  const u = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { roleId: true } });
  if (!u || (u.roleId ?? 0) < 2) return { ok: false as const, status: 403 as const };
  return { ok: true, status: 200 as const };
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({ where: { id }, select: { id: true, status: true, userId: true } });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const session = await getSession();
  const access = await canAccessPhoto(photo, session?.userId ?? null);
  if (!access.ok) return NextResponse.json({ error: "forbidden" }, { status: access.status });

  const comments = await prisma.photoComment.findMany({
    where: { photoId: id },
            orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      body: true,
              pinned: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({ comments });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "content_type_invalid" }, { status: 400 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({ where: { id }, select: { id: true, status: true, userId: true } });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const access = await canAccessPhoto(photo, session.userId);
  if (!access.ok) return NextResponse.json({ error: "forbidden" }, { status: access.status });
  if (photo.status !== "approved") return NextResponse.json({ error: "not_allowed" }, { status: 409 });

  const body = (await request.json().catch(() => ({}))) as { body?: string };
  {
    const allowedKeys = new Set(["body"]);
    const extra = Object.keys((body || {}) as Record<string, unknown>).filter((k) => !allowedKeys.has(k));
    if (extra.length) return NextResponse.json({ error: "unexpected_parameters" }, { status: 400 });
  }
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty_comment" }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "comment_too_long" }, { status: 400 });

  const moderation = await getModerationConfig();
  const ip = getClientIpFromHeaders(request.headers);
  const hit = matchModeration(text, moderation);
  if (hit.level === "high") {
    await enforceHighRiskAction({
      userId: session.userId,
      ip,
      source: "photo_comment",
      text,
      matches: hit.matches,
      config: moderation,
    });
    return NextResponse.json({ error: moderation.highLockMessage }, { status: 403 });
  }
  if (hit.level === "low") {
    await createLowRiskIncident({
      userId: session.userId,
      ip,
      source: "photo_comment",
      text,
      matches: hit.matches,
    });
    return NextResponse.json({ ok: true, moderatedDeleted: true });
  }

  const row = await prisma.photoComment.create({
    data: { photoId: id, userId: session.userId, body: text, pinned: false },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: row.id });
}
