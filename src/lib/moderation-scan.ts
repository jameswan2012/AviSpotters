import { prisma } from "@/lib/db";
import {
  createLowRiskIncident,
  enforceHighRiskAction,
  getModerationConfig,
  matchModeration,
  normalizeTextForModeration,
} from "@/lib/moderation";

export async function runModerationScan(params?: { limit?: number; source?: string }) {
  const config = await getModerationConfig();
  const limit = Math.max(10, Math.min(1000, Number(params?.limit || 100)));
  if (!config.enabled) {
    return { scanned: 0, lowDeleted: 0, highLocked: 0, source: params?.source ?? "cron" };
  }

  let scanned = 0;
  let lowDeleted = 0;
  let highLocked = 0;

  const [photoComments, supportMessages, chatMessages, videoComments] = await Promise.all([
    prisma.photoComment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, userId: true, body: true },
    }),
    prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, senderId: true, body: true },
    }),
    prisma.chatMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, userId: true, body: true },
    }),
    prisma.videoComment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, body: true, account: { select: { userId: true } } },
    }),
  ]);

  for (const row of photoComments) {
    const text = normalizeTextForModeration(row.body);
    if (!text) continue;
    scanned += 1;
    const hit = matchModeration(text, config);
    if (hit.level === "none") continue;
    if (hit.level === "low") {
      await prisma.photoComment.delete({ where: { id: row.id } }).catch(() => {});
      await createLowRiskIncident({
        userId: row.userId,
        ip: null,
        source: "scan_photo_comment",
        text,
        matches: hit.matches,
      });
      lowDeleted += 1;
      continue;
    }
    await enforceHighRiskAction({
      userId: row.userId,
      ip: null,
      source: "scan_photo_comment",
      text,
      matches: hit.matches,
      config,
    });
    await prisma.photoComment.delete({ where: { id: row.id } }).catch(() => {});
    highLocked += 1;
  }

  for (const row of supportMessages) {
    const text = normalizeTextForModeration(row.body);
    if (!text) continue;
    scanned += 1;
    const hit = matchModeration(text, config);
    if (hit.level === "none") continue;
    if (hit.level === "low") {
      await prisma.message.delete({ where: { id: row.id } }).catch(() => {});
      await createLowRiskIncident({
        userId: row.senderId,
        ip: null,
        source: "scan_support_message",
        text,
        matches: hit.matches,
      });
      lowDeleted += 1;
      continue;
    }
    await enforceHighRiskAction({
      userId: row.senderId,
      ip: null,
      source: "scan_support_message",
      text,
      matches: hit.matches,
      config,
    });
    await prisma.message.delete({ where: { id: row.id } }).catch(() => {});
    highLocked += 1;
  }

  for (const row of chatMessages) {
    const text = normalizeTextForModeration(row.body);
    if (!text) continue;
    scanned += 1;
    const hit = matchModeration(text, config);
    if (hit.level === "none") continue;
    if (hit.level === "low") {
      await prisma.chatMessage.delete({ where: { id: row.id } }).catch(() => {});
      await createLowRiskIncident({
        userId: row.userId,
        ip: null,
        source: "scan_chat_message",
        text,
        matches: hit.matches,
      });
      lowDeleted += 1;
      continue;
    }
    await enforceHighRiskAction({
      userId: row.userId,
      ip: null,
      source: "scan_chat_message",
      text,
      matches: hit.matches,
      config,
    });
    await prisma.chatMessage.delete({ where: { id: row.id } }).catch(() => {});
    highLocked += 1;
  }

  for (const row of videoComments) {
    const text = normalizeTextForModeration(row.body);
    if (!text) continue;
    scanned += 1;
    const hit = matchModeration(text, config);
    if (hit.level === "none") continue;
    if (hit.level === "low") {
      await prisma.videoComment.delete({ where: { id: row.id } }).catch(() => {});
      await createLowRiskIncident({
        userId: row.account.userId,
        ip: null,
        source: "scan_video_comment",
        text,
        matches: hit.matches,
      });
      lowDeleted += 1;
      continue;
    }
    await enforceHighRiskAction({
      userId: row.account.userId,
      ip: null,
      source: "scan_video_comment",
      text,
      matches: hit.matches,
      config,
    });
    await prisma.videoComment.delete({ where: { id: row.id } }).catch(() => {});
    highLocked += 1;
  }

  return { scanned, lowDeleted, highLocked, source: params?.source ?? "cron" };
}

