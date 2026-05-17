import { prisma } from "@/lib/db";

export const INTERACTION_ACCOUNT_PREFIX = "__interaction__";

export function isInteractionOnlyNickname(nickname?: string | null): boolean {
  return String(nickname || "").startsWith(INTERACTION_ACCOUNT_PREFIX);
}

export function isInteractionOnlyAccount(account?: { nickname?: string | null } | null): boolean {
  if (!account) return false;
  return isInteractionOnlyNickname(account.nickname);
}

export async function getAnyVideoAccount(userId: string) {
  return prisma.videoAccount.findUnique({
    where: { userId },
    select: {
      id: true,
      nickname: true,
      certificationBannedUntil: true,
    },
  });
}

export async function getInteractionCapableVideoAccount(userId: string) {
  const existing = await getAnyVideoAccount(userId);
  if (existing) return existing;

  const shadowNickname = `${INTERACTION_ACCOUNT_PREFIX}${userId.slice(-12)}`;
  return prisma.videoAccount.create({
    data: {
      userId,
      nickname: shadowNickname,
      isPublic: false,
      bio: "interaction-only",
    },
    select: {
      id: true,
      nickname: true,
      certificationBannedUntil: true,
    },
  });
}

export async function getPublishingVideoAccount(userId: string) {
  const account = await getAnyVideoAccount(userId);
  if (!account) return null;
  if (isInteractionOnlyAccount(account)) return null;
  return account;
}
