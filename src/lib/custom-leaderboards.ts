import type { Locale } from "@/i18n/shared";
import { prisma } from "@/lib/db";

export type CustomLeaderboardMetric = "approved_count" | "pass_rate";
export type CustomLeaderboardRangeKey = "all" | "7d" | "30d" | "custom";

export type CustomLeaderboardDef = {
  id: string;
  enabled: boolean;
  titleJson: string;
  descJson: string | null;
  metric: string;
  rangeKey: string;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  participantsJson: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function getLocalizedText(locale: Locale, json: string, fallback: string) {
  const m = safeParse<Record<string, string>>(json, {});
  return (m[locale] || m["zh-Hans"] || m["zh-Hant"] || m["en"] || fallback).trim() || fallback;
}

export function normalizeMetric(raw: string | null | undefined): CustomLeaderboardMetric {
  const s = String(raw ?? "").trim();
  return s === "pass_rate" ? "pass_rate" : "approved_count";
}

export function normalizeRangeKey(raw: string | null | undefined): CustomLeaderboardRangeKey {
  const s = String(raw ?? "").trim();
  return s === "7d" || s === "30d" || s === "custom" ? s : "all";
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function resolveRange(def: Pick<CustomLeaderboardDef, "rangeKey" | "rangeStart" | "rangeEnd">) {
  const key = normalizeRangeKey(def.rangeKey);
  if (key === "7d") return { since: daysAgo(7), start: null as Date | null, end: null as Date | null };
  if (key === "30d") return { since: daysAgo(30), start: null as Date | null, end: null as Date | null };
  if (key === "custom") return { since: null as Date | null, start: def.rangeStart ?? null, end: def.rangeEnd ?? null };
  return { since: null as Date | null, start: null as Date | null, end: null as Date | null };
}

export async function listEnabledLeaderboards(): Promise<CustomLeaderboardDef[]> {
  return prisma.customLeaderboard.findMany({
    where: { enabled: true },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      enabled: true,
      titleJson: true,
      descJson: true,
      metric: true,
      rangeKey: true,
      rangeStart: true,
      rangeEnd: true,
      participantsJson: true,
      createdAt: true,
      updatedAt: true,
    },
  }) as any;
}

export async function getLeaderboard(id: string): Promise<CustomLeaderboardDef | null> {
  return (await prisma.customLeaderboard.findUnique({
    where: { id },
    select: {
      id: true,
      enabled: true,
      titleJson: true,
      descJson: true,
      metric: true,
      rangeKey: true,
      rangeStart: true,
      rangeEnd: true,
      participantsJson: true,
      createdAt: true,
      updatedAt: true,
    },
  })) as any;
}

export type CustomLeaderboardRow = {
  userId: string;
  name: string;
  approved: number;
  rejected: number;
  passRate: number | null;
  score: number;
};

export async function computeLeaderboard(def: CustomLeaderboardDef): Promise<CustomLeaderboardRow[]> {
  const metric = normalizeMetric(def.metric);
  const { since, start, end } = resolveRange(def);
  const participants = safeParse<string[]>(def.participantsJson, []).filter(Boolean);
  const userFilter = participants.length ? { userId: { in: participants } } : {};

  const timeFilter =
    since
      ? { reviewedAt: { gte: since } }
      : start || end
        ? { reviewedAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } }
        : {};

  const [approved, rejected] = await Promise.all([
    prisma.photo.groupBy({
      by: ["userId"],
      where: { status: "approved", ...timeFilter, ...userFilter } as any,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 400,
    }),
    prisma.photo.groupBy({
      by: ["userId"],
      where: { status: "rejected", ...timeFilter, ...userFilter } as any,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1200,
    }),
  ]);

  const approvedMap = new Map<string, number>();
  for (const r of approved) approvedMap.set(r.userId, r._count.id);
  const rejectedMap = new Map<string, number>();
  for (const r of rejected) rejectedMap.set(r.userId, r._count.id);

  const userIds = participants.length ? participants : [...new Set([...approvedMap.keys(), ...rejectedMap.keys()])];
  if (!userIds.length) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  const uMap = new Map(users.map((u) => [u.id, u]));

  const rows: CustomLeaderboardRow[] = userIds
    .map((id) => {
      const u = uMap.get(id);
      if (!u) return null;
      const a = approvedMap.get(id) ?? 0;
      const r = rejectedMap.get(id) ?? 0;
      const denom = a + r;
      const passRate = denom ? Math.round((a / denom) * 1000) / 10 : null;
      const score = metric === "pass_rate" ? (passRate ?? -1) : a;
      const name = (u.name && u.name.trim()) ? u.name.trim() : u.email;
      return { userId: id, name, approved: a, rejected: r, passRate, score };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  rows.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    if (y.approved !== x.approved) return y.approved - x.approved;
    return x.name.localeCompare(y.name);
  });

  return rows.slice(0, 100);
}

