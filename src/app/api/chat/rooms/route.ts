import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

const LOBBY_ID = "lobby";
const ADMINS_ID = "admins";
const SUPER_ID = "superadmins";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const meRoleId = toRoleId(user.roleId);
  if (meRoleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Ensure official rooms exist (idempotent) and membership exists.
  await prisma.chatRoom.upsert({
    where: { id: LOBBY_ID },
    create: { id: LOBBY_ID, type: "public", name: "All Screeners+", createdById: user.id },
    update: { name: "All Screeners+" },
  });
  await prisma.chatRoom.upsert({
    where: { id: ADMINS_ID },
    create: { id: ADMINS_ID, type: "public", name: "All Admins+", createdById: user.id },
    update: { name: "All Admins+" },
  });
  await prisma.chatRoom.upsert({
    where: { id: SUPER_ID },
    create: { id: SUPER_ID, type: "public", name: "Super Admin Group", createdById: user.id },
    update: { name: "Super Admin Group" },
  });

  await prisma.chatMember.upsert({
    where: { roomId_userId: { roomId: LOBBY_ID, userId: user.id } },
    create: { roomId: LOBBY_ID, userId: user.id, role: "member" },
    update: {},
  });
  if (meRoleId >= 3) {
    await prisma.chatMember.upsert({
      where: { roomId_userId: { roomId: ADMINS_ID, userId: user.id } },
      create: { roomId: ADMINS_ID, userId: user.id, role: "member" },
      update: {},
    });
  }
  if (meRoleId >= 4) {
    await prisma.chatMember.upsert({
      where: { roomId_userId: { roomId: SUPER_ID, userId: user.id } },
      create: { roomId: SUPER_ID, userId: user.id, role: "member" },
      update: {},
    });
  }

  const rows = await prisma.chatMember.findMany({
    where: { userId: user.id },
    orderBy: { room: { updatedAt: "desc" } },
    select: {
      room: {
        select: {
          id: true,
          type: true,
          name: true,
          updatedAt: true,
          directKey: true,
          members: {
            select: { user: { select: { id: true, name: true, email: true, roleId: true, avatarUpdatedAt: true } } },
          },
        },
      },
    },
  });

  const rooms = rows.map((r) => {
    const room = r.room;
    const other =
      room.type === "direct" ? room.members.map((m) => m.user).find((u) => u.id !== user.id) ?? null : null;
    return {
      id: room.id,
      type: room.type,
      name: room.name,
      updatedAt: room.updatedAt,
      directKey: room.directKey,
      directUser: other ? { id: other.id, name: other.name, email: other.email, roleId: other.roleId, avatarUpdatedAt: other.avatarUpdatedAt } : null,
    };
  });

  return NextResponse.json({ rooms });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any = null;
  try {
    body = (await req.json()) as any;
  } catch {
    body = null;
  }

  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
  if (name.length > 40) return NextResponse.json({ error: "name_too_long" }, { status: 400 });

  const room = await prisma.$transaction(async (tx) => {
    const room = await tx.chatRoom.create({
      data: { type: "public", name, createdById: user.id },
      select: { id: true, type: true, name: true, updatedAt: true },
    });
    await tx.chatMember.create({ data: { roomId: room.id, userId: user.id, role: "owner" } });
    return room;
  });

  return NextResponse.json({ ok: true, room });
}

