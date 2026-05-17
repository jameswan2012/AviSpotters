import { NextResponse } from "next/server";
import path from "path";
import { unlink } from "fs/promises";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { uploadsRoot, writeFileEnsured } from "@/lib/uploads";
import { assertMagicMatchesAllowed, scanWithClamAVIfEnabled } from "@/lib/upload-security";

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

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await requireSuperAdmin();
  const { id } = await ctx.params;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  const allow = isAllowedImage(file);
  if (!allow) return NextResponse.json({ error: "only_jpg_png" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    assertMagicMatchesAllowed(bytes, allow.ext === "png" ? ["png"] : ["jpeg"]);
    await scanWithClamAVIfEnabled(bytes, file.name || `staff-question.${allow.ext}`);
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("unsafe_upload_type")) return NextResponse.json({ error: "unsafe_file_type" }, { status: 400 });
    if (msg === "unsafe_upload_virus_found") return NextResponse.json({ error: "virus_found" }, { status: 400 });
    if (msg === "unsafe_upload_scan_unavailable") return NextResponse.json({ error: "scan_unavailable" }, { status: 503 });
    return NextResponse.json({ error: "upload_security_failed" }, { status: 400 });
  }
  const relPath = path.posix.join("staff-application-questions", `${id}.${allow.ext}`);
  const absPath = path.join(uploadsRoot(), relPath);
  await writeFileEnsured(absPath, bytes);

  await prisma.staffApplicationQuestion.update({
    where: { id },
    data: { imagePath: relPath, imageMime: allow.mime, imageSizeBytes: file.size, updatedById: user.id },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await requireSuperAdmin();
  const { id } = await ctx.params;

  const q = await prisma.staffApplicationQuestion.findUnique({ where: { id }, select: { imagePath: true } });
  if (q?.imagePath) {
    const abs = path.join(uploadsRoot(), q.imagePath);
    await unlink(abs).catch(() => {});
  }

  await prisma.staffApplicationQuestion.update({
    where: { id },
    data: { imagePath: null, imageMime: null, imageSizeBytes: null, updatedById: user.id },
  });

  return NextResponse.json({ ok: true });
}

