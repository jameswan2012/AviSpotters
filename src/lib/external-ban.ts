import { prisma } from "@/lib/db";
import { decodeBanReason } from "@/lib/ban-scope";

type ExternalBanRow = {
  id: number;
  username: string | null;
  phone_number: string | null;
  email: string | null;
  reason: string | null;
  created_at: string | null;
  expires_at: string | null;
};

type ExternalBanIdentifiers = {
  username?: string | null;
  phone?: string | null;
  email?: string | null;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_SYNC_INTERVAL_MS = 5 * 60 * 1000;

let bansCache: { at: number; rows: ExternalBanRow[] } = { at: 0, rows: [] };
let lastSyncAt = 0;

function cfg() {
  const baseUrl = (process.env.BAN_API_BASE_URL || "").trim();
  const apiKey = (process.env.BAN_API_KEY || "").trim();
  const syncIntervalMs = Math.max(
    60 * 1000,
    Number.isFinite(Number(process.env.BAN_API_SYNC_INTERVAL_MS))
      ? Number(process.env.BAN_API_SYNC_INTERVAL_MS)
      : DEFAULT_SYNC_INTERVAL_MS
  );
  return { baseUrl, apiKey, syncIntervalMs };
}

function enabled() {
  const c = cfg();
  return !!c.baseUrl && !!c.apiKey;
}

function normalize(v: string | null | undefined) {
  return String(v || "")
    .trim()
    .toLowerCase();
}

function same(a: string | null | undefined, b: string | null | undefined) {
  return normalize(a) !== "" && normalize(a) === normalize(b);
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  if (!Number.isFinite(t)) return false;
  return t <= Date.now();
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

async function apiFetch(pathname: string, init?: RequestInit) {
  const c = cfg();
  if (!c.baseUrl || !c.apiKey) throw new Error("external_ban_not_configured");
  const url = `${c.baseUrl.replace(/\/+$/, "")}${pathname}`;
  const t = withTimeout(DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-api-key": c.apiKey,
        ...(init?.headers || {}),
      },
      signal: t.controller.signal,
      cache: "no-store",
    });
    return res;
  } finally {
    clearTimeout(t.timer);
  }
}

async function fetchBans(force = false): Promise<ExternalBanRow[]> {
  if (!enabled()) return [];
  if (!force && Date.now() - bansCache.at < 30_000 && bansCache.rows.length) return bansCache.rows;
  const res = await apiFetch("/api/bans", { method: "GET" });
  if (!res.ok) throw new Error(`external_ban_fetch_failed_${res.status}`);
  const rows = (await res.json().catch(() => [])) as ExternalBanRow[];
  const arr = Array.isArray(rows) ? rows : [];
  bansCache = { at: Date.now(), rows: arr };
  return arr;
}

function matchRow(row: ExternalBanRow, ids: ExternalBanIdentifiers) {
  return same(row.email, ids.email) || same(row.phone_number, ids.phone) || same(row.username, ids.username);
}

export async function checkExternalBanAndAutoUnban(ids: ExternalBanIdentifiers) {
  if (!enabled()) return { blocked: false as const, reason: null as string | null, expiresAt: null as string | null };
  const valid = normalize(ids.email) || normalize(ids.phone) || normalize(ids.username);
  if (!valid) return { blocked: false as const, reason: null as string | null, expiresAt: null as string | null };

  let rows: ExternalBanRow[] = [];
  try {
    rows = await fetchBans(true);
  } catch (e) {
    console.error("external ban check failed:", e);
    // Fail-open to avoid auth outage caused by external API.
    return { blocked: false as const, reason: null as string | null, expiresAt: null as string | null };
  }

  const matched = rows.filter((r) => matchRow(r, ids));
  if (!matched.length) return { blocked: false as const, reason: null as string | null, expiresAt: null as string | null };

  for (const row of matched) {
    if (isExpired(row.expires_at)) {
      try {
        const payload: Record<string, unknown> = row.id ? { id: row.id } : {};
        if (!payload.id && normalize(ids.username)) payload.username = ids.username;
        const res = await apiFetch("/api/bans/remove", {
          method: "DELETE",
          body: JSON.stringify(payload),
        });
        if (res.ok) bansCache.at = 0;
      } catch (e) {
        console.error("external ban auto-unban failed:", e);
      }
    }
  }

  // Re-fetch once after auto-unban attempts.
  const latest = await fetchBans(true).catch(() => matched);
  const active = latest.find((r) => matchRow(r, ids) && !isExpired(r.expires_at));
  if (!active) return { blocked: false as const, reason: null as string | null, expiresAt: null as string | null };
  return {
    blocked: true as const,
    reason: active.reason || null,
    expiresAt: active.expires_at || null,
  };
}

export async function addExternalBan(ids: ExternalBanIdentifiers, reason?: string | null, expiresAt?: Date | null) {
  if (!enabled()) return { ok: false as const, skipped: true as const };
  const payload: Record<string, unknown> = {};
  if (normalize(ids.username)) payload.username = ids.username;
  if (normalize(ids.phone)) payload.phone_number = ids.phone;
  if (normalize(ids.email)) payload.email = ids.email;
  if (!Object.keys(payload).length) return { ok: false as const, skipped: true as const };
  if (reason) payload.reason = String(reason).slice(0, 500);
  if (expiresAt) payload.expires_at = expiresAt.toISOString();
  const res = await apiFetch("/api/bans/add", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`external_ban_add_failed_${res.status}`);
  bansCache.at = 0;
  return { ok: true as const, skipped: false as const };
}

export async function syncPermanentBansToExternal(options?: { force?: boolean; limit?: number }) {
  if (!enabled()) return { ok: true, synced: 0, skipped: true };
  const c = cfg();
  const now = Date.now();
  if (!options?.force && now - lastSyncAt < c.syncIntervalMs) return { ok: true, synced: 0, skipped: true };
  lastSyncAt = now;

  const limit = Math.max(20, Math.min(2000, Number(options?.limit || 500)));
  const rows = await prisma.accountBan.findMany({
    where: { revokedAt: null, bannedUntil: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      reason: true,
      user: { select: { name: true, phone: true, email: true } },
    },
  });

  let external = [] as ExternalBanRow[];
  try {
    external = await fetchBans(true);
  } catch (e) {
    console.error("external ban sync fetch failed:", e);
    return { ok: false, synced: 0, skipped: false };
  }

  let synced = 0;
  for (const row of rows) {
    const parsed = decodeBanReason(row.reason);
    if (parsed.scope !== "global") continue;
    const ids: ExternalBanIdentifiers = {
      username: row.user.name,
      phone: row.user.phone,
      email: row.user.email,
    };
    const exists = external.some((e) => matchRow(e, ids) && !isExpired(e.expires_at));
    if (exists) continue;
    try {
      await addExternalBan(ids, parsed.reason || "permanent_ban", null);
      synced += 1;
    } catch (e) {
      console.error("external ban sync add failed:", e);
    }
  }
  return { ok: true, synced, skipped: false };
}

export async function syncUserBanToExternalByUserId(userId: string) {
  if (!enabled()) return;
  const ban = await prisma.accountBan.findFirst({
    where: { userId, revokedAt: null, OR: [{ bannedUntil: null }, { bannedUntil: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
    select: {
      bannedUntil: true,
      reason: true,
      user: { select: { name: true, phone: true, email: true } },
    },
  });
  if (!ban) return;
  const parsed = decodeBanReason(ban.reason);
  if (parsed.scope !== "global") return;
  try {
    await addExternalBan(
      { username: ban.user.name, phone: ban.user.phone, email: ban.user.email },
      parsed.reason || "manual_ban",
      ban.bannedUntil
    );
  } catch (e) {
    console.error("sync user ban to external failed:", e);
  }
}

export async function removeUserBanFromExternalByUserId(userId: string) {
  if (!enabled()) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, email: true },
  });
  if (!user) return;
  try {
    const rows = await fetchBans(true);
    const matched = rows.filter((r) =>
      matchRow(r, { username: user.name, phone: user.phone, email: user.email })
    );
    for (const row of matched) {
      const payload: Record<string, unknown> = row.id ? { id: row.id } : {};
      if (!payload.id && user.name) payload.username = user.name;
      await apiFetch("/api/bans/remove", {
        method: "DELETE",
        body: JSON.stringify(payload),
      }).catch(() => null);
    }
    bansCache.at = 0;
  } catch (e) {
    console.error("remove user ban from external failed:", e);
  }
}

