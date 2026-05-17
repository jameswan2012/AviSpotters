import bcrypt from "bcryptjs";

function clampInt(n: unknown, fallback: number) {
  const x = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  if (!Number.isFinite(x)) return fallback;
  return Math.trunc(x);
}

export function getBcryptCost() {
  const raw = clampInt(process.env.BCRYPT_COST, 12);
  // keep within a safe range for typical servers
  return Math.max(10, Math.min(14, raw));
}

export async function hashPassword(plain: string) {
  return await bcrypt.hash(String(plain), getBcryptCost());
}

export async function verifyPassword(plain: string, hash: string) {
  return await bcrypt.compare(String(plain), String(hash));
}

