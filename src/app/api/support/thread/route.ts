import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "尚未登入" }, { status: 401 });

  let conv = await prisma.conversation.findFirst({
    where: { userId: user.id, status: "open" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, assignedStaffId: true, updatedAt: true },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userId: user.id, status: "open" },
      select: { id: true, status: true, assignedStaffId: true, updatedAt: true },
    });
  }

  const msgs = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, createdAt: true, senderId: true },
    take: 200,
  });

  return NextResponse.json({
    conversation: { ...conv, updatedAt: conv.updatedAt.toISOString() },
    messages: msgs.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      mine: m.senderId === user.id,
    })),
  });
}

