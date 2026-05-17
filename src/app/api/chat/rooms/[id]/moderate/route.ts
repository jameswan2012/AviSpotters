import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

function canModerate(meRoleId: number, myMemberRole: string | null) {
  const staff = toRoleId(meRoleId) >= 4;
  if (staff) return true;
  return myMemberRole === "owner" || myMemberRole === "mod";
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: roomId } = await ctx.params;
  if (!roomId) return NextResponse.json({ error: "roomId_required" }, { status: 400 });
  if (roomId === "superadmins") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any = null;
  try {
    body = (await req.json()) as any;
  } catch {
    body = null;
  }

  const action = String(body?.action ?? "").trim();
  const userId = String(body?.userId ?? "").trim();
  const reason = body?.reason == null ? null : String(body.reason).trim().slice(0, 200);
  const minutes = body?.minutes == null ? null : Number(body.minutes);

  if (!action || !userId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (userId === me.id && (action === "kick" || action === "ban")) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { roleId: true } });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (toRoleId(target.roleId) >= 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const myMember = await prisma.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { role: true },
  });
  if (!myMember) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!canModerate(me.roleId, myMember.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const now = new Date();
  const until = Number.isFinite(minutes as any) && (minutes as number) > 0 ? new Date(now.getTime() + (minutes as number) * 60_000) : null;

  if (action === "mute") {
    await prisma.chatMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { mutedUntil: until },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "kick") {
    await prisma.chatMember.deleteMany({ where: { roomId, userId } });
    if (until || reason) {
      await prisma.chatRoomBan.create({
        data: { roomId, userId, reason, bannedUntil: until, createdById: me.id, revokedAt: null },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "ban") {
    // Remove membership immediately.
    await prisma.chatMember.deleteMany({ where: { roomId, userId } });

    const existing = await prisma.chatRoomBan.findFirst({
      where: { roomId, userId, revokedAt: null },
      select: { id: true },
    });
    if (existing) {
      await prisma.chatRoomBan.update({ where: { id: existing.id }, data: { reason, bannedUntil: until } });
    } else {
      await prisma.chatRoomBan.create({
        data: { roomId, userId, reason, bannedUntil: until, createdById: me.id, revokedAt: null },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "unban") {
    await prisma.chatRoomBan.updateMany({ where: { roomId, userId, revokedAt: null }, data: { revokedAt: now } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}

