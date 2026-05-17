import path from "path";
import { rm } from "fs/promises";
import { uploadsRoot } from "@/lib/uploads";

export async function deletePhotoUploadDir(photoId: string) {
  const dir = path.join(uploadsRoot(), "photos", photoId);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // best-effort: DB delete still proceeds
  }
}

export async function deletePhotoFiles(paths: string[]) {
  const uniq = Array.from(new Set(paths.map((p) => String(p || "").trim()).filter(Boolean)));
  for (const rel of uniq) {
    const abs = path.join(uploadsRoot(), rel);
    try {
      await rm(abs, { force: true });
    } catch {
      // best-effort
    }
  }
}

