export function normalizePhone(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  const out = `${hasPlus ? "+" : ""}${digits}`;
  if (digits.length < 6 || digits.length > 20) return "";
  return out;
}

export function looksLikePhone(input: string): boolean {
  return normalizePhone(input).length > 0;
}
