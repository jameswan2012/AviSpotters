import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { addExternalBan } from "@/lib/external-ban";
import { encodeBanReason, normalizeBanScope } from "@/lib/ban-scope";
import { normalizePhone } from "@/lib/phone-util";

function parseUntil(v: unknown): Date | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

type TargetType = "email" | "phone" | "username" | "ip";

export async function POST(request: Request) {
  const { user } = await requireSuperAdmin();
  const body = (await request.json().catch(() => ({}))) as {
    scope?: "local" | "global";
    targetType?: TargetType;
    value?: string;
    reason?: string;
    bannedUntil?: string | null;
  };

  const scope = normalizeBanScope(body.scope);
  const targetType = (body.targetType || "").trim() as TargetType;
  const valueRaw = String(body.value || "").trim();
  const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;
  const bannedUntil = parseUntil(body.bannedUntil);

  if (!["email", "phone", "username", "ip"].includes(targetType)) {
    return NextResponse.json({ error: "target_type_invalid" }, { status: 400 });
  }
  if (!valueRaw) return NextResponse.json({ error: "value_required" }, { status: 400 });
  if (scope === "global" && targetType === "ip") {
    return NextResponse.json({ error: "global_ip_not_supported" }, { status: 400 });
  }

  const value = targetType === "email" ? valueRaw.toLowerCase() : targetType === "phone" ? normalizePhone(valueRaw) : valueRaw;
  if (!value) return NextResponse.json({ error: "value_invalid" }, { status: 400 });

  if (scope === "global") {
    await addExternalBan(
      {
        email: targetType === "email" ? value : null,
        phone: targetType === "phone" ? value : null,
        username: targetType === "username" ? value : null,
      },
      reason || "admin_identity_ban",
      bannedUntil
    );
  }

  if (targetType === "ip") {
    await prisma.ipBan.create({
      data: {
        ip: value,
        reason: encodeBanReason(reason, scope),
        bannedUntil,
        createdById: user.id,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, localCreated: true, externalCreated: false });
  }

  let matchedUser:
    | {
        id: string;
      }
    | null = null;
  if (targetType === "email") {
    matchedUser = await prisma.user.findUnique({ where: { email: value }, select: { id: true } });
  } else if (targetType === "phone") {
    matchedUser = await prisma.user.findFirst({ where: { phone: value }, select: { id: true } });
  } else if (targetType === "username") {
    matchedUser = await prisma.user.findFirst({ where: { name: value }, select: { id: true } });
  }

  if (matchedUser) {
    await prisma.accountBan.create({
      data: {
        userId: matchedUser.id,
        reason: encodeBanReason(reason, scope),
        bannedUntil,
        createdById: user.id,
      },
      select: { id: true },
    });
  }

  if (scope === "local" && !matchedUser) {
    return NextResponse.json({ error: "local_target_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    localCreated: !!matchedUser,
    externalCreated: scope === "global",
  });
}

