import path from "path";
import { mkdir, writeFile, stat } from "fs/promises";

export function uploadsRoot() {
  return path.join(process.cwd(), "uploads");
}

export async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

export async function writeFileEnsured(filePath: string, data: Uint8Array) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, data);
}

export async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

