import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toRoleId } from "@/lib/roles";

function parseLimit(v: string | null) {
  const n = Number(v || "");
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: roomId } = await ctx.params;
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const now = new Date();
  const [member, ban] = await Promise.all([
    prisma.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      select: { id: true, lastReadAt: true },
    }),
    prisma.chatRoomBan.findFirst({
      where: { roomId, userId: user.id, revokedAt: null, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] },
      select: { id: true },
    }),
  ]);
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (ban) return NextResponse.json({ error: "banned" }, { status: 403 });

  // Update lastReadAt with low write frequency (polling-safe).
  try {
    const last = member.lastReadAt;
    if (!last || now.getTime() - last.getTime() > 15_000) {
      await prisma.chatMember.update({ where: { roomId_userId: { roomId, userId: user.id } }, data: { lastReadAt: now } });
    }
  } catch {
    // ignore
  }

  const url = new URL(_req.url);
  const after = url.searchParams.get("after");
  const limit = parseLimit(url.searchParams.get("limit"));
  const afterDate = after ? new Date(after) : null;

  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId,
      ...(afterDate && Number.isFinite(afterDate.getTime()) ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      body: true,
      attachmentsJson: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, roleId: true, avatarUpdatedAt: true } },
    },
  });

  // For direct rooms, provide read-receipt meta (if the other user allows it).
  let readReceipt: { otherLastReadAt: string | null; otherEnabled: boolean } | null = null;
  try {
    const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { type: true } });
    if (room?.type === "direct") {
      const other = await prisma.chatMember.findFirst({
        where: { roomId, userId: { not: user.id } },
        select: { lastReadAt: true, user: { select: { chatReadReceiptsEnabled: true } } },
      });
      const otherEnabled = other?.user?.chatReadReceiptsEnabled !== false;
      readReceipt = {
        otherLastReadAt: otherEnabled && other?.lastReadAt ? other.lastReadAt.toISOString() : null,
        otherEnabled,
      };
    }
  } catch {
    readReceipt = null;
  }

  return NextResponse.json({ messages, readReceipt });
}

