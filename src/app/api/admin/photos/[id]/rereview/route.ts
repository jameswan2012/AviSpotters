import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { REJECT_RETENTION_DAYS } from "@/lib/rejected-retention";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(me.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;

  const photo = await prisma.photo.findUnique({ where: { id }, select: { id: true, status: true, reviewedAt: true, updatedAt: true } });
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (photo.status === "pending") {
    return NextResponse.json({ error: "already pending" }, { status: 400 });
  }
  if (photo.status === "rejected") {
    const base = photo.reviewedAt ?? photo.updatedAt;
    const cutoff = new Date(Date.now() - REJECT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    if (base && base.getTime() < cutoff.getTime()) {
      return NextResponse.json({ error: "too_old_for_rereview" }, { status: 400 });
    }
  }

  const now = new Date();
  await prisma.photo.update({
    where: { id },
    data: {
      status: "pending",
      assignedReviewerId: null,
      reReviewRequestedAt: now,
      reReviewRequestedById: me.id,
      reReviewReason: reason,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}

