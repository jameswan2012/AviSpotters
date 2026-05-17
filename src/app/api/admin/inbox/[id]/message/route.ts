import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await getServerLocaleOnly();
  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);

  const { user, roleId } = await requireSuperAdmin();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { body?: string } | null;
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: tr("請輸入訊息", "请输入消息", "Please enter a message") }, { status: 400 });

  const conv = await prisma.conversation.findUnique({ where: { id }, select: { id: true, status: true, assignedStaffId: true } });
  if (!conv) return NextResponse.json({ error: tr("對話不存在", "对话不存在", "Thread not found") }, { status: 404 });
  if (conv.status !== "open") return NextResponse.json({ error: tr("對話已結案", "对话已结案", "Thread is closed") }, { status: 409 });

  // Single-owner thread rule:
  // - If unassigned, the first replier becomes the owner (assignedStaffId).
  // - If assigned, only the owner can reply. Super admin can override.
  if (conv.assignedStaffId && conv.assignedStaffId !== user.id && roleId < 4) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: { conversationId: conv.id, senderId: user.id, body: text },
      select: { id: true },
    });
    if (!conv.assignedStaffId) {
      await tx.conversation.update({
        where: { id: conv.id },
        data: { assignedStaffId: user.id },
        select: { id: true },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

