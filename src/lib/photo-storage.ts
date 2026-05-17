import path from "node:path";
import fs from "node:fs/promises";

export const PHOTO_DIR = path.join(process.cwd(), "data", "photos");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function savePhotoFile(args: {
  photoId: string;
  variant: "original" | "display";
  file: File;
}): Promise<{ absPath: string; relPath: string; sizeBytes: number }> {
  const { photoId, variant, file } = args;
  const dir = path.join(PHOTO_DIR, photoId);
  await ensureDir(dir);

  const ext = variant === "display" ? "jpg" : guessExt(file.type) ?? safeExtFromName(file.name) ?? "bin";
  const fileName = `${variant}.${ext}`;
  const absPath = path.join(dir, fileName);
  const relPath = path.relative(process.cwd(), absPath);

  const buf = Buffer.from(new Uint8Array(await file.arrayBuffer()));
  await fs.writeFile(absPath, buf);

  return { absPath, relPath, sizeBytes: buf.byteLength };
}

export async function readPhotoFile(absPath: string): Promise<Buffer> {
  return await fs.readFile(absPath);
}

function guessExt(mime: string | null | undefined): string | null {
  const m = (mime ?? "").toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  return null;
}

function safeExtFromName(name: string | null | undefined): string | null {
  const n = String(name ?? "");
  const idx = n.lastIndexOf(".");
  if (idx < 0) return null;
  const ext = n.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ext) return null;
  return ext.slice(0, 8);
}

