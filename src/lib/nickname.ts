import { prisma } from "@/lib/db";

const RESERVED_NAMES = [
  "admin",
  "administrator",
  "root",
  "system",
  "official",
  "support",
  "客服",
  "管理员",
  "管理員",
  "站长",
  "站長",
];

export function normalizeNickname(input: string) {
  return String(input ?? "").trim();
}

export function validateNicknameFormat(input: string): { ok: boolean; error?: string } {
  const name = normalizeNickname(input);
  if (!name) return { ok: false, error: "nickname_required" };
  if (name.length < 2 || name.length > 30) return { ok: false, error: "nickname_length_invalid" };
  // Allow CJK, Latin letters, digits and a small safe symbol set.
  if (!/^[\p{Script=Han}A-Za-z0-9_.#-]+$/u.test(name)) {
    return { ok: false, error: "nickname_chars_invalid" };
  }
  if (/^\d+$/.test(name)) return { ok: false, error: "nickname_digits_only_not_allowed" };
  if (RESERVED_NAMES.includes(name.toLowerCase())) return { ok: false, error: "nickname_reserved" };
  return { ok: true };
}

export async function isNicknameTaken(name: string, options?: { excludeUserId?: string; excludeVideoAccountId?: string }) {
  const normalized = normalizeNickname(name);
  if (!normalized) return false;
  const normalizedLower = normalized.toLowerCase();

  const [userRows, videoRows] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        name: { not: null },
        ...(options?.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
      },
      select: { id: true, name: true },
      take: 1000,
    }),
    prisma.videoAccount.findMany({
      where: {
        nickname: { not: "" },
        ...(options?.excludeVideoAccountId ? { id: { not: options.excludeVideoAccountId } } : {}),
      },
      select: { id: true, nickname: true },
      take: 1000,
    }),
  ]);
  if (userRows.some((row) => String(row.name ?? "").toLowerCase() === normalizedLower)) return true;
  return videoRows.some((row) => String(row.nickname ?? "").toLowerCase() === normalizedLower);
}

