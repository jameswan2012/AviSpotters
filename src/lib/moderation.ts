export type ModerationConfig = {
  enabled: boolean;
  highLockMessage: string;
  [key: string]: unknown;
};

export async function getModerationConfig(): Promise<ModerationConfig> {
  return {
    enabled: false,
    highLockMessage: "內容包含受限制詞語，已被拒絕。",
  };
}

export function matchModeration(_text: string, _config: ModerationConfig) {
  return { level: "none" as "none" | "low" | "high", matches: [] as string[] };
}

export async function enforceHighRiskAction(_params: {
  userId: string;
  ip?: string | null;
  source: string;
  text: string;
  matches: string[];
  config: ModerationConfig;
}) {}

export async function createLowRiskIncident(_params: {
  userId: string;
  ip?: string | null;
  source: string;
  text: string;
  matches: string[];
}) {}

export function normalizeTextForModeration(input: string) {
  return String(input || "").trim().toLowerCase();
}

export async function listModerationIncidents(_limit?: number) {
  return [];
}

export async function getExternalLexiconStatus() {
  return { configured: false, syncedAt: null };
}

export async function setModerationConfig(value: unknown, _updatedById?: string | null) {
  return value;
}
