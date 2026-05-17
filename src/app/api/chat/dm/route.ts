import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

function dmKey(a: string, b: string) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `dm:${x}:${y}`;
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(me.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any = null;
  try {
    body = (await req.json()) as any;
  } catch {
    body = null;
  }
  const otherId = String(body?.userId ?? "").trim();
  if (!otherId) return NextResponse.json({ error: "userId_required" }, { status: 400 });
  if (otherId === me.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, deletedAt: true } });
  if (!other || other.deletedAt) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const key = dmKey(me.id, otherId);

  const room = await prisma.$transaction(async (tx) => {
    const existing = await tx.chatRoom.findUnique({
      where: { directKey: key },
      select: { id: true, type: true, name: true, updatedAt: true, directKey: true },
    });
    if (existing) {
      await tx.chatMember.upsert({
        where: { roomId_userId: { roomId: existing.id, userId: me.id } },
        create: { roomId: existing.id, userId: me.id, role: "member" },
        update: {},
      });
      await tx.chatMember.upsert({
        where: { roomId_userId: { roomId: existing.id, userId: otherId } },
        create: { roomId: existing.id, userId: otherId, role: "member" },
        update: {},
      });
      return existing;
    }

    const created = await tx.chatRoom.create({
      data: { type: "direct", name: null, directKey: key, createdById: me.id },
      select: { id: true, type: true, name: true, updatedAt: true, directKey: true },
    });
    await tx.chatMember.upsert({
      where: { roomId_userId: { roomId: created.id, userId: me.id } },
      create: { roomId: created.id, userId: me.id, role: "member" },
      update: {},
    });
    await tx.chatMember.upsert({
      where: { roomId_userId: { roomId: created.id, userId: otherId } },
      create: { roomId: created.id, userId: otherId, role: "member" },
      update: {},
    });
    return created;
  });

  return NextResponse.json({ ok: true, roomId: room.id });
}

