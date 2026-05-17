import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  points: number;
  roleId: number;
  lastCheckInAt: Date | null;
  checkInStreak: number;
  displayTitle: string | null;
  lastSeenAt: Date | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      points: true,
      roleId: true,
      lastCheckInAt: true,
      checkInStreak: true,
      displayTitle: true,
      lastSeenAt: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) return null;

  try {
    const now = new Date();
    if (!user.lastSeenAt || now.getTime() - user.lastSeenAt.getTime() > 60_000) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: now },
      });
      user.lastSeenAt = now;
    }
  } catch {}

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    points: user.points,
    roleId: user.roleId,
    lastCheckInAt: user.lastCheckInAt,
    checkInStreak: user.checkInStreak,
    displayTitle: user.displayTitle,
    lastSeenAt: user.lastSeenAt,
  };
}
