import { prisma } from "@/lib/db";
import { getActiveNews, getMaintenanceSetting } from "@/lib/site-settings";

export const SYS_NOTIFY_PREFIX = "[[SYS_NOTIFY]]";

export type UserNoticeType =
  | "security_login_elsewhere"
  | "photo_review_result"
  | "photo_queue_new"
  | "video_queue_new"
  | "video_review_result"
  | "maintenance"
  | "news";

export type NoticeFilter = "all" | "review" | "security" | "system";

type NoticePayload = {
  title: string;
  body: string;
  type: UserNoticeType;
  meta?: Record<string, unknown>;
};

function encode(payload: NoticePayload) {
  return `${SYS_NOTIFY_PREFIX}${JSON.stringify(payload)}`;
}

function decode(raw: string | null | undefined): NoticePayload | null {
  const text = String(raw ?? "");
  if (!text.startsWith(SYS_NOTIFY_PREFIX)) return null;
  try {
    const parsed = JSON.parse(text.slice(SYS_NOTIFY_PREFIX.length)) as NoticePayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.title !== "string" || typeof parsed.body !== "string" || typeof parsed.type !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function notifyUserByEmail(params: {
  email: string;
  title: string;
  body: string;
  type: UserNoticeType;
  meta?: Record<string, unknown>;
}) {
  const payload: NoticePayload = {
    title: params.title,
    body: params.body,
    type: params.type,
    meta: params.meta,
  };
  await prisma.ticket.create({
    data: {
      email: params.email,
      body: encode(payload),
      status: "open",
      staffReply: null,
      resolvedById: null,
      resolvedAt: null,
    },
  });
}

export async function notifyUserById(params: {
  userId: string;
  title: string;
  body: string;
  type: UserNoticeType;
  meta?: Record<string, unknown>;
}) {
  const u = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, deletedAt: true },
  });
  if (!u || u.deletedAt) return;
  await notifyUserByEmail({
    email: u.email,
    title: params.title,
    body: params.body,
    type: params.type,
    meta: params.meta,
  });
}

export async function notifyStaffReviewers(params: {
  title: string;
  body: string;
  type: "photo_queue_new" | "video_queue_new";
  meta?: Record<string, unknown>;
  excludeUserId?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      roleId: { gte: 2 },
      ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
    },
    select: { id: true },
    take: 200,
  });
  await Promise.all(
    users.map((u) =>
      notifyUserById({
        userId: u.id,
        title: params.title,
        body: params.body,
        type: params.type,
        meta: params.meta,
      })
    )
  );
}

function matchesFilter(type: string, filter: NoticeFilter) {
  if (filter === "all") return true;
  if (filter === "system") return type === "maintenance" || type === "news";
  if (filter === "security") return type === "security_login_elsewhere";
  if (filter === "review")
    return (
      type === "photo_review_result" ||
      type === "video_review_result" ||
      type === "photo_queue_new" ||
      type === "video_queue_new"
    );
  return true;
}

export async function listUserNotificationsByEmail(
  email: string,
  params?: { filter?: NoticeFilter; unreadOnly?: boolean }
) {
  const filter = params?.filter ?? "all";
  const unreadOnly = params?.unreadOnly === true;
  const rows = await prisma.ticket.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: { id: true, body: true, status: true, createdAt: true },
  });
  const fromTickets = rows
    .map((r) => {
      const payload = decode(r.body);
      if (!payload) return null;
      return {
        id: `ticket:${r.id}`,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        createdAt: r.createdAt.toISOString(),
        unread: r.status === "open",
        source: "ticket" as const,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    title: string;
    body: string;
    type: string;
    createdAt: string;
    unread: boolean;
    source: "ticket";
  }>;

  const [maintenance, activeNews] = await Promise.all([getMaintenanceSetting(), getActiveNews()]);
  const systemRows: Array<{
    id: string;
    title: string;
    body: string;
    type: string;
    createdAt: string;
    unread: boolean;
    source: "system";
  }> = [];

  if (maintenance.enabled) {
    systemRows.push({
      id: "system:maintenance",
      title: "系统维护通知",
      body: maintenance.message || "站点正在维护中，部分功能可能受影响。",
      type: "maintenance",
      createdAt: new Date().toISOString(),
      unread: false,
      source: "system",
    });
  }
  if (activeNews) {
    systemRows.push({
      id: `system:news:${activeNews.id}`,
      title: `新闻：${activeNews.title}`,
      body: activeNews.body || "有一条新的站点新闻。",
      type: "news",
      createdAt: (activeNews.startsAt ?? new Date()).toISOString(),
      unread: false,
      source: "system",
    });
  }

  const merged = [...systemRows, ...fromTickets]
    .filter((x) => matchesFilter(x.type, filter))
    .filter((x) => (unreadOnly ? x.unread : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const unreadCount = [...systemRows, ...fromTickets].filter((x) => x.unread).length;
  return { notifications: merged, unreadCount };
}

export async function markUserNotificationReadByTicketId(ticketId: string, email: string) {
  await prisma.ticket.updateMany({
    where: { id: ticketId, email, status: "open" },
    data: { status: "closed" },
  });
}

export async function markAllUserNotificationsReadByEmail(email: string) {
  await prisma.ticket.updateMany({
    where: { email, status: "open" },
    data: { status: "closed" },
  });
}

