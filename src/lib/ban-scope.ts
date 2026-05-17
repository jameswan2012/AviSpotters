export type BanScope = "local" | "global";

const LOCAL_PREFIX = "__scope:local__";
const GLOBAL_PREFIX = "__scope:global__";

export function normalizeBanScope(v: unknown): BanScope {
  return v === "global" ? "global" : "local";
}

export function encodeBanReason(reason: string | null | undefined, scope: BanScope) {
  const clean = String(reason || "").trim();
  const prefix = scope === "global" ? GLOBAL_PREFIX : LOCAL_PREFIX;
  return clean ? `${prefix} ${clean}` : prefix;
}

export function decodeBanReason(rawReason: string | null | undefined) {
  const raw = String(rawReason || "").trim();
  if (!raw) return { scope: "local" as BanScope, reason: null as string | null };
  if (raw.startsWith(`${GLOBAL_PREFIX} `)) return { scope: "global" as BanScope, reason: raw.slice(GLOBAL_PREFIX.length + 1) || null };
  if (raw === GLOBAL_PREFIX) return { scope: "global" as BanScope, reason: null as string | null };
  if (raw.startsWith(`${LOCAL_PREFIX} `)) return { scope: "local" as BanScope, reason: raw.slice(LOCAL_PREFIX.length + 1) || null };
  if (raw === LOCAL_PREFIX) return { scope: "local" as BanScope, reason: null as string | null };
  return { scope: "local" as BanScope, reason: raw };
}

export function isGlobalBanReason(rawReason: string | null | undefined) {
  return decodeBanReason(rawReason).scope === "global";
}

