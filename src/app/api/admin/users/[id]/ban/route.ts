import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { removeUserBanFromExternalByUserId, syncUserBanToExternalByUserId } from "@/lib/external-ban";
import { decodeBanReason, encodeBanReason, normalizeBanScope } from "@/lib/ban-scope";

function parseUntil(v: unknown): Date | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const now = new Date();
  const ban = await prisma.accountBan.findFirst({
    where: { userId: id, revokedAt: null, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] },
    orderBy: { createdAt: "desc" },
    select: { id: true, reason: true, bannedUntil: true, createdAt: true, createdBy: { select: { name: true, email: true } } },
  });
  if (!ban) return NextResponse.json({ ban: null });
  const parsed = decodeBanReason(ban.reason);
  return NextResponse.json({ ban: { ...ban, reason: parsed.reason, scope: parsed.scope } });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await requireSuperAdmin();
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string; bannedUntil?: string | null; scope?: "local" | "global" };
  const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;
  const scope = normalizeBanScope(body.scope);
  const bannedUntil = parseUntil(body.bannedUntil);

  const target = await prisma.user.findUnique({ where: { id }, select: { roleId: true } });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ((target.roleId ?? 0) >= 4) return NextResponse.json({ error: "禁止封禁高級管理員" }, { status: 403 });

  const ban = await prisma.accountBan.create({
    data: { userId: id, reason: encodeBanReason(reason, scope), bannedUntil, createdById: user.id },
    select: { id: true },
  });
  if (scope === "global") void syncUserBanToExternalByUserId(id).catch(() => null);
  return NextResponse.json({ ok: true, id: ban.id });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const active = await prisma.accountBan.findFirst({
    where: { userId: id, revokedAt: null, OR: [{ bannedUntil: null }, { bannedUntil: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
    select: { reason: true },
  });
  const shouldRemoveExternal = active ? decodeBanReason(active.reason).scope === "global" : false;
  await prisma.accountBan.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (shouldRemoveExternal) void removeUserBanFromExternalByUserId(id).catch(() => null);
  return NextResponse.json({ ok: true });
}

