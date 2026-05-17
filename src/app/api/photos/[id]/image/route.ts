import { NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/db";
import { uploadsRoot } from "@/lib/uploads";
import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "node:stream";
import { getSession } from "@/lib/auth";
import { isRejectedPreviewOnly } from "@/lib/rejected-retention";
import { verifyPhotoEmailPreviewToken } from "@/lib/photo-email-preview-token";

function parseRange(range: string | null, size: number) {
  if (!range) return null;
  const m = range.match(/^bytes=(\d*)-(\d*)$/i);
  if (!m) return null;
  const startStr = m[1] ?? "";
  const endStr = m[2] ?? "";
  let start = startStr ? Number(startStr) : NaN;
  let end = endStr ? Number(endStr) : NaN;

  if (!Number.isFinite(start) && !Number.isFinite(end)) return null;
  if (!Number.isFinite(start)) {
    const suffix = Number(endStr);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else if (!Number.isFinite(end)) {
    end = size - 1;
  }
  if (start < 0 || end < 0 || start > end || start >= size) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const variant = (searchParams.get("variant") ?? "display").toLowerCase(); // display | thumb | original
  const emailPreviewToken = String(searchParams.get("emailPreviewToken") || "").trim();
  const hasEmailPreviewToken = emailPreviewToken ? await verifyPhotoEmailPreviewToken(emailPreviewToken, id) : false;

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      userId: true,
      originalPath: true,
      displayPath: true,
      thumbPath: true,
      status: true,
      reviewedAt: true,
      updatedAt: true,
      originalMime: true,
      displayMime: true,
    },
  });
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const session = await getSession();
  const isApprovedPublic = photo.status === "approved" && (variant === "thumb" || variant === "display");
  let viewerRoleId = 0;
  const isOwner = !!session && session.userId === photo.userId;
  if (session && !isOwner) {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { roleId: true } });
    viewerRoleId = user?.roleId ?? 0;
  }
  const isStaff = viewerRoleId >= 2;
  // email preview token is intentionally limited to thumbnail only
  if (hasEmailPreviewToken && variant !== "thumb") {
    return NextResponse.json({ error: "invalid_preview_variant" }, { status: 403 });
  }

  if (!isApprovedPublic && !isOwner && !isStaff && !hasEmailPreviewToken) {
    return NextResponse.json({ error: session ? "forbidden" : "unauthorized" }, { status: session ? 403 : 401 });
  }

  if (isRejectedPreviewOnly({ status: photo.status, reviewedAt: photo.reviewedAt, updatedAt: photo.updatedAt }) && variant !== "thumb") {
    return NextResponse.json({ error: "rejected_preview_only" }, { status: 410 });
  }

  const rel =
    variant === "thumb" ? photo.thumbPath : variant === "original" ? photo.originalPath : photo.displayPath;
  const abs = path.join(uploadsRoot(), rel);
  let fileStat;
  try {
    fileStat = await stat(abs);
  } catch {
    return NextResponse.json({ error: "file missing" }, { status: 404 });
  }
  const mime = variant === "original" ? photo.originalMime : photo.displayMime;
  const range = parseRange(request.headers.get("range"), fileStat.size);

  if (range) {
    const { start, end } = range;
    const chunkSize = end - start + 1;
    const stream = createReadStream(abs, { start, end });
    return new Response(Readable.toWeb(stream) as any, {
      status: 206,
      headers: {
        "content-type": mime || "application/octet-stream",
        "accept-ranges": "bytes",
        "content-length": String(chunkSize),
        "content-range": `bytes ${start}-${end}/${fileStat.size}`,
        "cache-control": isApprovedPublic ? "public, max-age=86400, stale-while-revalidate=604800" : "private, no-store",
      },
    });
  }

  const stream = createReadStream(abs);

  return new Response(Readable.toWeb(stream) as any, {
    headers: {
      "content-type": mime || "application/octet-stream",
      "accept-ranges": "bytes",
      "content-length": String(fileStat.size),
      "cache-control": isApprovedPublic ? "public, max-age=86400, stale-while-revalidate=604800" : "private, no-store",
    },
  });
}

