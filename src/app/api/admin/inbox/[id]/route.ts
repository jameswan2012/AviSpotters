import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, roleId } = await requireSuperAdmin();
  const { id } = await params;

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      assignedStaffId: true,
      user: { select: { email: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, senderId: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: "對話不存在" }, { status: 404 });

  // Single-owner thread rule:
  // - Once a staff replies (assignedStaffId is set), only the assigned staff can view/reply.
  // - Super Admin can always view.
  if (roleId < 4 && conv.assignedStaffId && conv.assignedStaffId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    conversationId: conv.id,
    userLabel: conv.user.name ? `${conv.user.name}（${conv.user.email}）` : conv.user.email,
    status: conv.status,
    assignedStaffId: conv.assignedStaffId,
    canReply: roleId >= 4 && conv.status === "open",
    canClose: roleId >= 4 && conv.status === "open",
    messages: conv.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      mine: m.senderId === user.id,
    })),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, roleId } = await requireSuperAdmin();
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: "close" | "reopen" };
  const action = body.action ?? null;
  if (action !== "close" && action !== "reopen") return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const conv = await prisma.conversation.findUnique({ where: { id }, select: { id: true, status: true, assignedStaffId: true } });
  if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (roleId < 4 && conv.assignedStaffId && conv.assignedStaffId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (action === "close") {
    if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const updated = await prisma.conversation.update({ where: { id }, data: { status: "closed" }, select: { id: true } });
    return NextResponse.json({ ok: true, conversation: updated });
  }

  // reopen: super admin only (avoid reopening by mistake)
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const updated = await prisma.conversation.update({ where: { id }, data: { status: "open" }, select: { id: true } });
  return NextResponse.json({ ok: true, conversation: updated });
}

