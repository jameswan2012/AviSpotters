import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { decodeBanReason, encodeBanReason, normalizeBanScope } from "@/lib/ban-scope";

function parseUntil(v: unknown): Date | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function GET() {
  await requireSuperAdmin();
  const now = new Date();
  const rows = await prisma.ipBan.findMany({
    where: { revokedAt: null, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, ip: true, reason: true, bannedUntil: true, createdAt: true, createdBy: { select: { name: true, email: true } } },
  });
  return NextResponse.json({
    bans: rows.map((r) => {
      const parsed = decodeBanReason(r.reason);
      return { ...r, reason: parsed.reason, scope: parsed.scope };
    }),
  });
}

export async function POST(request: Request) {
  const { user } = await requireSuperAdmin();
  const body = (await request.json().catch(() => ({}))) as {
    ip?: string;
    reason?: string;
    bannedUntil?: string | null;
    scope?: "local" | "global";
  };
  const ip = typeof body.ip === "string" ? body.ip.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;
  const bannedUntil = parseUntil(body.bannedUntil);
  const scope = normalizeBanScope(body.scope);
  if (!ip) return NextResponse.json({ error: "ip required" }, { status: 400 });

  const ban = await prisma.ipBan.create({
    data: { ip, reason: encodeBanReason(reason, scope), bannedUntil, createdById: user.id },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: ban.id });
}

export async function DELETE(request: Request) {
  const { user } = await requireSuperAdmin();
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.ipBan.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.ipBan.updateMany({ where: { id }, data: { updatedAt: new Date(), createdById: user.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}

