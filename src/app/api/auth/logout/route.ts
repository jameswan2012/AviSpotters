import { NextResponse } from "next/server";

function cookieSecureFlag() {
  const v = (process.env.COOKIE_SECURE ?? "").trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  if (v === "1" || v === "true" || v === "yes") return true;
  return process.env.NODE_ENV === "production";
}

function isIpHost(hostname: string) {
  const h = String(hostname || "").trim().toLowerCase();
  if (!h) return false;
  if (h === "localhost") return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  // basic IPv6 hostname form (without brackets in URL.hostname)
  if (h.includes(":")) return true;
  return false;
}

function cookieDomainsForHost(hostname: string) {
  const h = String(hostname || "").trim().toLowerCase();
  if (!h || isIpHost(h) || h === "localhost") return [] as string[];
  const parts = h.split(".").filter(Boolean);
  if (parts.length < 2) return [h];
  const root = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  return Array.from(new Set([h, `.${h}`, root, `.${root}`]));
}

function applyLogoutCookie(res: NextResponse, requestUrl?: string) {
  const secure = cookieSecureFlag();
  const base = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
  // Host-only cookie (current standard)
  res.cookies.set("avispotters_session", "", { ...base, secure });
  // Legacy compatibility: clear both secure/non-secure variants.
  res.cookies.set("avispotters_session", "", { ...base, secure: !secure });

  if (requestUrl) {
    const hostname = new URL(requestUrl).hostname;
    const domains = cookieDomainsForHost(hostname);
    for (const domain of domains) {
      res.cookies.set("avispotters_session", "", { ...base, secure, domain });
      res.cookies.set("avispotters_session", "", { ...base, secure: !secure, domain });
    }
  }
  return res;
}

function safeRedirectTarget(raw: string | null) {
  const v = String(raw || "").trim();
  if (!v.startsWith("/") || v.startsWith("//")) return "/";
  return v;
}

export async function POST(request: Request) {
  return applyLogoutCookie(NextResponse.json({ ok: true }), request.url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const to = safeRedirectTarget(url.searchParams.get("redirect"));
  return applyLogoutCookie(NextResponse.redirect(new URL(to, request.url)), request.url);
}
