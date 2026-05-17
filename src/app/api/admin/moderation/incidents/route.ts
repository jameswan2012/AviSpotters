import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { listModerationIncidents } from "@/lib/moderation";

function parseBanHours(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(24 * 365, Math.round(n)));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 3) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const incidents = await listModerationIncidents(300);
  return NextResponse.json({ incidents });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    incidentId?: string;
    action?: "approve" | "ban";
    banHours?: number;
    banIp?: boolean;
    note?: string;
  };
  const incidentId = String(body.incidentId ?? "").trim();
  if (!incidentId) return NextResponse.json({ error: "incident_id_required" }, { status: 400 });

  const row = await prisma.ticket.findUnique({
    where: { id: incidentId },
    select: { id: true, email: true, body: true, status: true },
  });
  if (!row || row.email !== "__system_moderation__@local") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let incidentUserId: string | null = null;
  let incidentIp: string | null = null;
  try {
    const raw = String(row.body ?? "");
    const payload = JSON.parse(raw.replace("[[MODERATION_INCIDENT]]", ""));
    incidentUserId = typeof payload?.userId === "string" ? payload.userId : null;
    incidentIp = typeof payload?.ip === "string" ? payload.ip : null;
  } catch {
    // ignore parse failure and still allow closing ticket
  }

  const action = body.action === "ban" ? "ban" : "approve";
  const note = String(body.note ?? "").trim().slice(0, 500);

  if (action === "approve") {
    if (incidentUserId) {
      await prisma.accountBan.updateMany({
        where: { userId: incidentUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await prisma.ticket.update({
      where: { id: incidentId },
      data: {
        status: "closed",
        staffReply: note || "approved_unlocked",
        resolvedAt: new Date(),
        resolvedById: user.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const hours = parseBanHours(body.banHours) ?? 24;
  const until = new Date(Date.now() + hours * 60 * 60 * 1000);

  if (incidentUserId) {
    await prisma.accountBan.create({
      data: {
        userId: incidentUserId,
        createdById: user.id,
        bannedUntil: until,
        reason: note || `manual_moderation_ban_${hours}h`,
      },
    });
  }
  if (body.banIp === true && incidentIp) {
    await prisma.ipBan.create({
      data: {
        ip: incidentIp,
        createdById: user.id,
        bannedUntil: until,
        reason: note || `manual_moderation_ip_ban_${hours}h`,
      },
    });
  }

  await prisma.ticket.update({
    where: { id: incidentId },
    data: {
      status: "closed",
      staffReply: note || `violated_banned_${hours}h`,
      resolvedAt: new Date(),
      resolvedById: user.id,
    },
  });
  return NextResponse.json({ ok: true });
}

