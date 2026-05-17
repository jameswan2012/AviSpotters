import { prisma } from "@/lib/db";
import { deletePhotoFiles, deletePhotoUploadDir } from "@/lib/photo-delete";

export const REJECT_PREVIEW_ONLY_DAYS = 14;
export const REJECT_DELETE_AFTER_DAYS = 30;
// Backward compatibility for existing imports.
export const REJECT_RETENTION_DAYS = REJECT_PREVIEW_ONLY_DAYS;

export function getRejectAgeBase(row: { reviewedAt?: Date | null; updatedAt?: Date | null }) {
  return row.reviewedAt ?? row.updatedAt ?? new Date(0);
}

export function isRejectedPreviewOnly(row: { status: string; reviewedAt?: Date | null; updatedAt?: Date | null }, now = new Date()) {
  if (row.status !== "rejected") return false;
  const base = getRejectAgeBase(row);
  return now.getTime() - base.getTime() >= REJECT_PREVIEW_ONLY_DAYS * 24 * 60 * 60 * 1000;
}

export async function purgeRejectedPhotos(params?: { now?: Date; days?: number; limit?: number }) {
  const now = params?.now ?? new Date();
  const limit = typeof params?.limit === "number" && Number.isFinite(params.limit) ? Math.max(1, Math.floor(params.limit)) : 200;
  const previewCutoff = new Date(now.getTime() - REJECT_PREVIEW_ONLY_DAYS * 24 * 60 * 60 * 1000);
  const deleteCutoff = new Date(now.getTime() - REJECT_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  // Stage 1: keep preview only after 14 days (delete original + display).
  const previewRows = await prisma.photo.findMany({
    where: {
      status: "rejected",
      OR: [{ reviewedAt: { lt: previewCutoff } }, { reviewedAt: null, updatedAt: { lt: previewCutoff } }],
      AND: [{ OR: [{ reviewedAt: { gte: deleteCutoff } }, { reviewedAt: null, updatedAt: { gte: deleteCutoff } }] }],
    },
    orderBy: [{ reviewedAt: "asc" }, { updatedAt: "asc" }],
    take: limit,
    select: { id: true, originalPath: true, displayPath: true },
  });

  let previewOnly = 0;
  for (const r of previewRows) {
    await deletePhotoFiles([r.originalPath, r.displayPath]);
    previewOnly += 1;
  }

  // Stage 2: hard delete after 30 days.
  const deleteRows = await prisma.photo.findMany({
    where: {
      status: "rejected",
      OR: [{ reviewedAt: { lt: deleteCutoff } }, { reviewedAt: null, updatedAt: { lt: deleteCutoff } }],
    },
    orderBy: [{ reviewedAt: "asc" }, { updatedAt: "asc" }],
    take: limit,
    select: { id: true },
  });

  let deleted = 0;
  for (const r of deleteRows) {
    try {
      await prisma.photo.delete({ where: { id: r.id } });
    } catch {
      continue;
    }
    await deletePhotoUploadDir(r.id);
    deleted += 1;
  }

  return {
    previewOnly,
    deleted,
    scannedPreview: previewRows.length,
    scannedDelete: deleteRows.length,
    previewCutoff: previewCutoff.toISOString(),
    deleteCutoff: deleteCutoff.toISOString(),
  };
}

