import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";

function isSuperAdmin(roleId: number) {
  return toRoleId(roleId) >= 4;
}

function safeJsonParse<T>(s: unknown, fallback: T): T {
  if (typeof s !== "string") return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function normText(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function normBool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function normMetric(v: unknown) {
  const s = normText(v);
  return s === "pass_rate" ? "pass_rate" : "approved_count";
}

function normRangeKey(v: unknown) {
  const s = normText(v);
  return s === "7d" || s === "30d" || s === "custom" ? s : "all";
}

function normDate(v: unknown) {
  if (v == null) return null;
  const s = normText(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function normUserIds(v: unknown) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map((x) => normText(x)).filter(Boolean);
  if (typeof v === "string") {
    // allow passing JSON string or newline/comma separated text
    const arr = safeJsonParse<string[]>(v, []);
    if (Array.isArray(arr) && arr.length) return arr.map((x) => normText(x)).filter(Boolean);
    return v
      .split(/[\n,，\s]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return null;
}

function buildI18nJson(input: any, kind: "title" | "desc") {
  const obj = (input && typeof input === "object" ? input : null) as any;
  const zhHant = normText(obj?.zhHant ?? obj?.["zh-Hant"]);
  const zhHans = normText(obj?.zhHans ?? obj?.["zh-Hans"]);
  const en = normText(obj?.en);
  if (kind === "title" && !zhHant && !zhHans && !en) return null;
  if (kind === "desc" && !zhHant && !zhHans && !en) return null;
  return JSON.stringify({ "zh-Hant": zhHant, "zh-Hans": zhHans, en });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user.roleId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await prisma.customLeaderboard.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
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
      updatedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ leaderboards: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user.roleId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as any;
  const enabled = normBool(body.enabled, true);
  const titleJson = buildI18nJson(body.title, "title");
  if (!titleJson) return NextResponse.json({ error: "title_required" }, { status: 400 });
  const descJson = buildI18nJson(body.desc, "desc");
  const metric = normMetric(body.metric);
  const rangeKey = normRangeKey(body.rangeKey);
  const rangeStart = rangeKey === "custom" ? normDate(body.rangeStart) : null;
  const rangeEnd = rangeKey === "custom" ? normDate(body.rangeEnd) : null;
  const userIds = normUserIds(body.participants);
  const participantsJson = userIds && userIds.length ? JSON.stringify(userIds) : null;

  const row = await prisma.customLeaderboard.create({
    data: {
      enabled,
      titleJson,
      descJson,
      metric,
      rangeKey,
      rangeStart,
      rangeEnd,
      participantsJson,
      createdById: user.id,
      updatedById: user.id,
    },
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
      updatedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, leaderboard: row });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user.roleId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as any;
  const data: any = { updatedById: user.id };
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (body.title !== undefined) {
    const titleJson = buildI18nJson(body.title, "title");
    if (!titleJson) return NextResponse.json({ error: "title_required" }, { status: 400 });
    data.titleJson = titleJson;
  }
  if (body.desc !== undefined) data.descJson = buildI18nJson(body.desc, "desc");
  if (body.metric !== undefined) data.metric = normMetric(body.metric);
  if (body.rangeKey !== undefined) data.rangeKey = normRangeKey(body.rangeKey);

  const nextRangeKey = data.rangeKey ?? undefined;
  const effectiveRangeKey = typeof nextRangeKey === "string" ? nextRangeKey : undefined;
  const finalRangeKey = effectiveRangeKey ?? undefined;

  if (body.rangeStart !== undefined) data.rangeStart = normDate(body.rangeStart);
  if (body.rangeEnd !== undefined) data.rangeEnd = normDate(body.rangeEnd);

  if ((finalRangeKey && finalRangeKey !== "custom") || (body.rangeKey && normRangeKey(body.rangeKey) !== "custom")) {
    data.rangeStart = null;
    data.rangeEnd = null;
  }

  if (body.participants !== undefined) {
    const userIds = normUserIds(body.participants);
    data.participantsJson = userIds && userIds.length ? JSON.stringify(userIds) : null;
  }

  const updated = await prisma.customLeaderboard.update({
    where: { id },
    data,
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
      updatedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, leaderboard: updated });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user.roleId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await prisma.customLeaderboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

