import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { NextResponse } from "next/server";

const SESSION_COOKIE = "avispotters_session";
const SESSION_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "avispotters-secret-change-in-production");

export type SessionPayload = {
  userId: string;
  email?: string | null;
  roleId?: number;
  name?: string | null;
};

function cookieSecureFlag() {
  const raw = (process.env.COOKIE_SECURE ?? "").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "no";
}

function cookieBase() {
  const domain = String(process.env.COOKIE_DOMAIN || "").trim() || undefined;
  return {
    httpOnly: true as const,
    secure: cookieSecureFlag(),
    sameSite: "lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export async function createSession(payloadOrUserId: SessionPayload | string, email?: string | null, roleId?: number, name?: string | null) {
  const payload =
    typeof payloadOrUserId === "string"
      ? { userId: payloadOrUserId, email: email ?? null, roleId: roleId ?? 0, name: name ?? null }
      : payloadOrUserId;
  return new SignJWT({
    userId: payload.userId,
    email: payload.email ?? null,
    roleId: Number(payload.roleId ?? 0),
    name: payload.name ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SESSION_SECRET);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    const userId = String(payload.userId ?? "").trim();
    if (!userId) return null;
    return {
      userId,
      email: typeof payload.email === "string" ? payload.email : null,
      roleId: Number(payload.roleId ?? 0),
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    ...cookieBase(),
    maxAge: 0,
    expires: new Date(0),
  });
}

export function clearSessionCookieOnResponse(response: NextResponse, _request?: Request) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieBase(),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
