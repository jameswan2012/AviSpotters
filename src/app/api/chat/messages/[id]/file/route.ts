import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { uploadsRoot } from "@/lib/uploads";
import { toRoleId } from "@/lib/roles";

type Attachment = { type?: string; path?: string; mime?: string };

function safeParseAttachments(raw: string | null): Attachment[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as any[]) : [];
  } catch {
    return [];
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const msg = await prisma.chatMessage.findUnique({
    where: { id },
    select: { id: true, roomId: true, kind: true, attachmentsJson: true },
  });
  if (!msg) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const member = await prisma.chatMember.findUnique({
    where: { roomId_userId: { roomId: msg.roomId, userId: user.id } },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const now = new Date();
  const ban = await prisma.chatRoomBan.findFirst({
    where: { roomId: msg.roomId, userId: user.id, revokedAt: null, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] },
    select: { id: true },
  });
  if (ban) return NextResponse.json({ error: "banned" }, { status: 403 });

  const attachments = safeParseAttachments(msg.attachmentsJson);
  const file = attachments.find((a) => (a?.type === "image" || a?.type === "video") && typeof a?.path === "string");
  if (!file?.path) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const abs = path.join(uploadsRoot(), file.path);
  const bytes = await readFile(abs);
  const mime = typeof file.mime === "string" && file.mime ? file.mime : "application/octet-stream";

  return new NextResponse(bytes, {
    headers: {
      "content-type": mime,
      "cache-control": "private, max-age=0, no-store",
    },
  });
}

