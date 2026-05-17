import { NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
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

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.roleId >= 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const approvedCount = await prisma.photo.count({ where: { userId: user.id, status: "approved" } });
  if (approvedCount <= 100) return NextResponse.json({ error: "not_eligible" }, { status: 403 });

  const form = await req.formData();
  const applicationId = String(form.get("applicationId") ?? "").trim();
  const file = form.get("file");
  if (!applicationId) return NextResponse.json({ error: "applicationId_required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  const allow = isAllowedImage(file);
  if (!allow) return NextResponse.json({ error: "only_jpg_png" }, { status: 400 });

  const app = await prisma.staffApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, status: true, imagesJson: true },
  });
  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (app.userId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (app.status !== "draft") return NextResponse.json({ error: "not_editable" }, { status: 409 });

  const existing = safeParse<any[]>(app.imagesJson, []);
  if (existing.length >= MAX_FILES) return NextResponse.json({ error: "too_many_files" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    assertMagicMatchesAllowed(bytes, allow.ext === "png" ? ["png"] : ["jpeg"]);
    await scanWithClamAVIfEnabled(bytes, file.name || `staff-application.${allow.ext}`);
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("unsafe_upload_type")) return NextResponse.json({ error: "unsafe_file_type" }, { status: 400 });
    if (msg === "unsafe_upload_virus_found") return NextResponse.json({ error: "virus_found" }, { status: 400 });
    if (msg === "unsafe_upload_scan_unavailable") return NextResponse.json({ error: "scan_unavailable" }, { status: 503 });
    return NextResponse.json({ error: "upload_security_failed" }, { status: 400 });
  }
  const fileId = crypto.randomUUID();
  const safeName = `${fileId}.${allow.ext}`;
  const relPath = path.posix.join("staff-applications", applicationId, safeName);
  const absPath = path.join(uploadsRoot(), relPath);
  await writeFileEnsured(absPath, bytes);

  const nextImages = existing.concat([{ name: file.name || safeName, path: relPath, mime: allow.mime, sizeBytes: file.size }]).slice(0, MAX_FILES);

  const application = await prisma.staffApplication.update({
    where: { id: applicationId },
    data: { imagesJson: JSON.stringify(nextImages) },
    select: { id: true, status: true, tracksJson: true, imagesJson: true, answersJson: true, submittedAt: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, application });
}

