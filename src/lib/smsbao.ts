import { normalizePhone } from "@/lib/phone-util";

const SMSBAO_ERROR_MAP: Record<string, string> = {
  "30": "smsbao_bad_password",
  "40": "smsbao_account_not_found",
  "41": "smsbao_balance_insufficient",
  "43": "smsbao_ip_limited",
  "50": "smsbao_sensitive_content",
  "51": "smsbao_phone_invalid",
};

function envTrim(name: string): string {
  return String(process.env[name] || "").trim();
}

function resolveSmsBaoUsername() {
  return envTrim("SMSBAO_USERNAME") || envTrim("SMSBAO_USER") || envTrim("SMSBAO_U");
}

function resolveSmsBaoApiKey() {
  return envTrim("SMSBAO_API_KEY") || envTrim("SMSBAO_KEY") || envTrim("SMSBAO_P");
}

function resolveSmsBaoEndpointTemplate() {
  return envTrim("SMSBAO_API_URL") || "https://api.smsbao.com/sms?u={u}&p={p}&m={mobile}&c={content}";
}

export function isSmsBaoConfigured() {
  return !!(resolveSmsBaoUsername() && resolveSmsBaoApiKey());
}

export async function sendSmsCode(params: { phone: string; code: string }) {
  const username = resolveSmsBaoUsername();
  const apiKey = resolveSmsBaoApiKey();
  if (!username || !apiKey) {
    const e: any = new Error("sms_not_configured");
    throw e;
  }

  const phone = normalizePhone(params.phone);
  if (!phone) throw new Error("phone_invalid");
  const smsbaoPhone = phone.replace(/[^\d]/g, "");
  if (!smsbaoPhone) throw new Error("phone_invalid");
  const content = `【AviSpotters】验证码${params.code}，10分钟内有效。`;
  const endpointTemplate = resolveSmsBaoEndpointTemplate();
  const endpoint = endpointTemplate
    .replaceAll("{u}", encodeURIComponent(username))
    .replaceAll("{p}", encodeURIComponent(apiKey))
    .replaceAll("{mobile}", encodeURIComponent(smsbaoPhone))
    .replaceAll("{content}", encodeURIComponent(content));

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), 15000);
  try {
    const res = await fetch(endpoint, { method: "GET", signal: ac.signal, cache: "no-store" });
    const text = (await res.text()).trim();
    if (text !== "0") {
      throw new Error(SMSBAO_ERROR_MAP[text] || `smsbao_error_${text}`);
    }
    return { ok: true as const };
  } catch (e: any) {
    if (String(e?.name || "").toLowerCase().includes("abort")) {
      throw new Error("sms_timeout");
    }
    if (String(e?.message || "").startsWith("smsbao_")) throw e;
    const rootMsg = String(e?.message || "unknown");
    throw new Error(`sms_network_error:${rootMsg}`);
  } finally {
    clearTimeout(timer);
  }
}
