import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(me.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const row = await prisma.user.findUnique({ where: { id: me.id }, select: { chatReadReceiptsEnabled: true } });
  return NextResponse.json({ chatReadReceiptsEnabled: row?.chatReadReceiptsEnabled !== false });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(me.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as any;
  const enabled = body?.chatReadReceiptsEnabled !== false;
  await prisma.user.update({ where: { id: me.id }, data: { chatReadReceiptsEnabled: enabled } });
  return NextResponse.json({ ok: true, chatReadReceiptsEnabled: enabled });
}

