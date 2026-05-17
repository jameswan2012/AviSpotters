import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { verifyEmailOtp, type EmailVerifyPurpose } from "@/lib/email-verify";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; purpose?: string; code?: string };
  const purpose = (body.purpose ?? "").trim() as EmailVerifyPurpose;
  const email = typeof body.email === "string" ? body.email : "";
  const code = typeof body.code === "string" ? body.code : "";

  const allowed: EmailVerifyPurpose[] = ["register", "deactivate", "photo_delete", "change_password", "change_name", "change_email"];
  if (!allowed.includes(purpose)) return NextResponse.json({ error: "bad_purpose" }, { status: 400 });

  const user = purpose === "register" ? null : await getCurrentUser();
  if (purpose !== "register" && !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // For logged-in purposes, lock email target to the correct address.
  const targetEmail =
    purpose === "register"
      ? email
      : purpose === "change_email"
        ? email
        : user?.email ?? "";

  if (!targetEmail) return NextResponse.json({ error: "email_required" }, { status: 400 });

  try {
    const r = await verifyEmailOtp({ email: targetEmail, purpose, code, userId: user?.id ?? null });
    return NextResponse.json(r);
  } catch (e: any) {
    const msg = String(e?.message || "");
    const map: Record<string, number> = {
      email_required: 400,
      code_invalid: 400,
      code_wrong: 400,
      code_expired: 400,
      too_many_attempts: 429,
      unauthorized: 401,
      forbidden: 403,
    };
    const status = map[msg] ?? 400;
    return NextResponse.json({ error: msg || "verify_failed" }, { status });
  }
}

