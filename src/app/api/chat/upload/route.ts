import { NextResponse } from "next/server";
import path from "path";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { uploadsRoot, writeFileEnsured } from "@/lib/uploads";
import { toRoleId } from "@/lib/roles";
import { assertMagicMatchesAllowed, scanWithClamAVIfEnabled, type AllowedKind } from "@/lib/upload-security";

function extFromName(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx + 1).toLowerCase();
}

function isAllowedImage(file: File) {
  const mime = (file.type || "").toLowerCase();
  const ext = extFromName(file.name || "");
  const isJpg = mime === "image/jpeg" || ext === "jpg" || ext === "jpeg";
  const isPng = mime === "image/png" || ext === "png";
  if (!isJpg && !isPng) return null;
  return { ext: isPng ? "png" : "jpg", mime: isPng ? "image/png" : "image/jpeg" };
}

function isAllowedVideo(file: File) {
  const mime = (file.type || "").toLowerCase();
  const ext = extFromName(file.name || "");
  const isMp4 = mime === "video/mp4" || ext === "mp4";
  const isWebm = mime === "video/webm" || ext === "webm";
  if (!isMp4 && !isWebm) return null;
  return { ext: isWebm ? "webm" : "mp4", mime: isWebm ? "video/webm" : "video/mp4" };
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const roomId = String(form.get("roomId") ?? "").trim();
  const file = form.get("file");
  if (!roomId) return NextResponse.json({ error: "roomId_required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });
  const allowImg = isAllowedImage(file);
  const allowVid = allowImg ? null : isAllowedVideo(file);
  const allow = allowImg ? { kind: "image" as const, ...allowImg, max: MAX_IMAGE_BYTES } : allowVid ? { kind: "video" as const, ...allowVid, max: MAX_VIDEO_BYTES } : null;
  if (!allow) return NextResponse.json({ error: "only_jpg_png_mp4_webm" }, { status: 400 });
  if (file.size > allow.max) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  const now = new Date();
  const [member, ban] = await Promise.all([
    prisma.chatMember.findUnique({ where: { roomId_userId: { roomId, userId: user.id } }, select: { mutedUntil: true } }),
    prisma.chatRoomBan.findFirst({
      where: { roomId, userId: user.id, revokedAt: null, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] },
      select: { id: true },
    }),
  ]);
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (ban) return NextResponse.json({ error: "banned" }, { status: 403 });
  if (member.mutedUntil && member.mutedUntil > now) return NextResponse.json({ error: "muted" }, { status: 403 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const allowed: AllowedKind[] =
      allow.kind === "image" ? (allow.ext === "png" ? ["png"] : ["jpeg"]) : allow.ext === "webm" ? ["webm"] : ["mp4"];
    assertMagicMatchesAllowed(bytes, allowed);
    await scanWithClamAVIfEnabled(bytes, file.name || `${allow.kind}.${allow.ext}`);
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("unsafe_upload_type")) return NextResponse.json({ error: "unsafe_file_type" }, { status: 400 });
    if (msg === "unsafe_upload_virus_found") return NextResponse.json({ error: "virus_found" }, { status: 400 });
    if (msg === "unsafe_upload_scan_unavailable") return NextResponse.json({ error: "scan_unavailable" }, { status: 503 });
    return NextResponse.json({ error: "upload_security_failed" }, { status: 400 });
  }

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.chatMessage.create({
      data: { roomId, userId: user.id, kind: allow.kind, body: "" },
      select: {
        id: true,
        kind: true,
        body: true,
        attachmentsJson: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, roleId: true, avatarUpdatedAt: true } },
      },
    });

    const relPath = path.posix.join("chat", roomId, `${msg.id}.${allow.ext}`);
    const absPath = path.join(uploadsRoot(), relPath);
    await writeFileEnsured(absPath, bytes);

    const attachments = [{ type: allow.kind, path: relPath, mime: allow.mime }];
    await tx.chatMessage.update({
      where: { id: msg.id },
      data: { attachmentsJson: JSON.stringify(attachments) },
    });

    await tx.chatRoom.update({ where: { id: roomId }, data: { updatedAt: now } });
    await tx.chatMember.update({ where: { roomId_userId: { roomId, userId: user.id } }, data: { lastReadAt: now } });

    return { ...msg, attachmentsJson: JSON.stringify(attachments) };
  });

  return NextResponse.json({ ok: true, message });
}

