import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEFAULT_THEME, resolveTheme, THEME_COOKIE } from "@/lib/theme";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { theme?: string };
  const theme = resolveTheme(body.theme ?? DEFAULT_THEME);

  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true, theme });
}

