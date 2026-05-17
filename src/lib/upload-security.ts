import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export type AllowedKind = "png" | "jpeg" | "gif" | "webm" | "mp4";

const execFileAsync = promisify(execFile);

function startsWith(bytes: Uint8Array, prefix: number[]) {
  if (bytes.length < prefix.length) return false;
  return prefix.every((v, index) => bytes[index] === v);
}

export function assertMagicMatchesAllowed(bytes: Uint8Array, allowed: AllowedKind[]) {
  const isPng = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  const isJpeg = startsWith(bytes, [0xff, 0xd8, 0xff]);
  const isGif = startsWith(bytes, [0x47, 0x49, 0x46, 0x38]);
  const isMp4 = bytes.length > 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  const isWebm = bytes.length > 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  const ok =
    (isPng && allowed.includes("png")) ||
    (isJpeg && allowed.includes("jpeg")) ||
    (isGif && allowed.includes("gif")) ||
    (isMp4 && allowed.includes("mp4")) ||
    (isWebm && allowed.includes("webm"));
  if (!ok) throw new Error("unsafe_upload_type");
}

export async function scanWithClamAVIfEnabled(bytes: Uint8Array, filename: string) {
  const enabled = String(process.env.CLAMAV_ENABLED || "").trim().toLowerCase();
  if (!enabled || enabled === "0" || enabled === "false" || enabled === "no") return;

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "avispotters-scan-"));
  const tmpFile = path.join(tmpDir, filename || "upload.bin");
  try {
    await writeFile(tmpFile, bytes);
    const result = await execFileAsync("clamscan", ["--no-summary", tmpFile]).catch((error: any) => {
      const stderr = String(error?.stderr || "");
      const code = Number(error?.code ?? 1);
      if (code === 1 && /FOUND/i.test(stderr)) throw new Error("unsafe_upload_virus_found");
      throw new Error("unsafe_upload_scan_unavailable");
    });
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    if (/FOUND/i.test(output)) throw new Error("unsafe_upload_virus_found");
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
