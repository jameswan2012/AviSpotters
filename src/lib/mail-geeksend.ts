import type { SendMailParams, SendMailResult } from "@/lib/mailer";

function envTrim(key: string) {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

type GeeksendTokenCache = {
  accessToken: string;
  expiresAtMs: number;
} | null;

let tokenCache: GeeksendTokenCache = null;

function resolveBaseUrl() {
  return envTrim("GEEKSEND_BASE_URL") || "https://open.geeksend.com";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (e?.name === "AbortError") {
      throw new Error(`geeksend_timeout_${timeoutMs}ms`);
    }
    if (/fetch failed|network|econn|enotfound|timed out/i.test(msg)) {
      throw new Error(`geeksend_network_error:${msg.slice(0, 180)}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function resolveSenderAddress() {
  return envTrim("GEEKSEND_SENDER") || envTrim("SMTP_FROM") || "";
}

export function isGeeksendConfigured() {
  return !!envTrim("GEEKSEND_CLIENT_ID") && !!envTrim("GEEKSEND_CLIENT_SECRET");
}

async function fetchGeeksendToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 30_000) {
    return tokenCache.accessToken;
  }

  const clientId = envTrim("GEEKSEND_CLIENT_ID");
  const clientSecret = envTrim("GEEKSEND_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("geeksend_not_configured");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const endpoint = `${resolveBaseUrl().replace(/\/+$/, "")}/oauth/access_token`;
  const resp = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  }, 12_000);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`geeksend_token_http_${resp.status}:${text.slice(0, 180)}`);
  }
  const data = (await resp.json().catch(() => ({}))) as any;
  const accessToken = String(data?.data?.access_token || "").trim();
  const expireInRaw = Number(data?.data?.expire_in || data?.data?.expires_in || 0);
  if (!accessToken) {
    const info = typeof data?.info === "string" ? data.info : "token_missing";
    throw new Error(`geeksend_token_invalid:${info}`);
  }
  const expireIn = Number.isFinite(expireInRaw) && expireInRaw > 0 ? expireInRaw : 1200;
  tokenCache = {
    accessToken,
    expiresAtMs: now + expireIn * 1000,
  };
  return accessToken;
}

function buildSendPayload(params: SendMailParams) {
  const sender = resolveSenderAddress();
  if (!sender) throw new Error("geeksend_sender_missing");

  // Use HTML when available; fallback to plain text.
  const content = (params.html || params.text || "").trim();
  if (!content) throw new Error("mail_content_empty");

  const form = new URLSearchParams();
  form.append("emails", params.to);
  form.append("subject", params.subject);
  form.append("content", content);
  form.append("sender", sender);

  const replyEmail = envTrim("GEEKSEND_REPLY_EMAIL");
  if (replyEmail) form.append("reply_email", replyEmail);
  const traceLink = envTrim("GEEKSEND_TRACE_LINK");
  if (traceLink) form.append("is_trace_link", traceLink);
  const traceOpen = envTrim("GEEKSEND_TRACE_OPEN");
  if (traceOpen) form.append("is_trace_open", traceOpen);
  return form;
}

function sanitizeGeeksendResult(raw: any, to: string): SendMailResult {
  const requestId = String(raw?.results?.request_id || raw?.request_id || "").trim();
  const taskId = raw?.results?.task_id ?? raw?.task_id;
  const response = taskId != null ? `geeksend_task:${String(taskId)}` : "geeksend_sent";
  return {
    accepted: [to],
    messageId: requestId || undefined,
    response,
  };
}

export async function sendViaGeeksend(params: SendMailParams): Promise<SendMailResult> {
  const token = await fetchGeeksendToken();
  const endpoint = `${resolveBaseUrl().replace(/\/+$/, "")}/send/email`;
  const body = buildSendPayload(params);
  const resp = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  }, 15_000);
  const data = (await resp.json().catch(() => ({}))) as any;
  if (!resp.ok) {
    const msg = typeof data?.msg === "string" ? data.msg : typeof data?.info === "string" ? data.info : "send_http_error";
    throw new Error(`geeksend_send_http_${resp.status}:${msg}`);
  }
  // Geeksend docs: success=true means success; some APIs may return code=1.
  const success = data?.success === true || Number(data?.code || 0) === 1;
  if (!success) {
    const msg = typeof data?.msg === "string" ? data.msg : typeof data?.info === "string" ? data.info : "send_failed";
    throw new Error(`geeksend_send_failed:${msg}`);
  }
  return sanitizeGeeksendResult(data, params.to);
}

