import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLocalizedText, listEnabledLeaderboards, resolveRange } from "@/lib/custom-leaderboards";
import { getServerLocaleOnly } from "@/i18n/server";

type RangeKey = "all" | "30d" | "7d";

function parseRange(input: string | null): RangeKey {
  if (input === "30d" || input === "7d" || input === "all") return input;
  return "all";
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function displayName(name: string | null, email: string) {
  if (name && name.trim()) return name.trim();
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = (local ?? "").slice(0, 2);
  return `${head}***@${domain}`;
}

export async function GET(request: Request) {
  const locale = await getServerLocaleOnly();
  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));
  const since = range === "30d" ? daysAgo(30) : range === "7d" ? daysAgo(7) : null;

  const [approved, rejected] = await Promise.all([
    prisma.photo.groupBy({
      by: ["userId"],
      where: since ? { status: "approved", reviewedAt: { gte: since } } : { status: "approved" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 80,
    }),
    prisma.photo.groupBy({
      by: ["userId"],
      where: since ? { status: "rejected", reviewedAt: { gte: since } } : { status: "rejected" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 400,
    }),
  ]);

  const approvedMap = new Map<string, number>();
  for (const r of approved) approvedMap.set(r.userId, r._count.id);
  const rejectedMap = new Map<string, number>();
  for (const r of rejected) rejectedMap.set(r.userId, r._count.id);
  const userIds = [...approvedMap.keys()];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = userIds
    .map((id) => {
      const u = userMap.get(id);
      if (!u) return null;
      const a = approvedMap.get(id) ?? 0;
      const r = rejectedMap.get(id) ?? 0;
      const denom = a + r;
      const passRate = denom ? Math.round((a / denom) * 1000) / 10 : null;
      return { userId: id, name: displayName(u.name, u.email), approved: a, rejected: r, passRate };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 50);

  const custom = await listEnabledLeaderboards();
  const customCards = custom.slice(0, 12).map((lb) => {
    const title = getLocalizedText(locale, lb.titleJson, "Leaderboard");
    const desc = lb.descJson ? getLocalizedText(locale, lb.descJson, "") : "";
    const { since, start, end } = resolveRange(lb);
    const hint = since ? lb.rangeKey : start || end ? "custom" : "all";
    return { id: lb.id, title, desc, hint };
  });

  return NextResponse.json({ range, rows, custom: customCards });
}

