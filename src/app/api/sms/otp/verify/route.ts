import { NextResponse } from "next/server";
import { verifySmsOtp, verifyPhoneBindToken, type SmsVerifyPurpose } from "@/lib/phone-verify";
import { getCurrentUser } from "@/lib/current-user";
import { getRegistrationSetting } from "@/lib/site-settings";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    purpose?: SmsVerifyPurpose;
    code?: string;
    bindToken?: string;
  };

  const purpose = String(body.purpose || "") as SmsVerifyPurpose;
  const allowed: SmsVerifyPurpose[] = ["register", "login_bind_phone", "change_phone"];
  if (!allowed.includes(purpose)) return NextResponse.json({ error: "bad_purpose" }, { status: 400 });

  const setting = await getRegistrationSetting();
  if (!setting.phoneFeatureEnabled) {
    return NextResponse.json({ error: "phone_feature_disabled" }, { status: 403 });
  }

  let userId: string | null = null;
  if (purpose === "change_phone") {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
  } else if (purpose === "login_bind_phone") {
    try {
      const bind = await verifyPhoneBindToken(String(body.bindToken || ""));
      userId = bind.userId;
    } catch {
      return NextResponse.json({ error: "bind_token_invalid" }, { status: 401 });
    }
  }

  try {
    const result = await verifySmsOtp({
      phone: String(body.phone || ""),
      purpose,
      code: String(body.code || ""),
      userId,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    const msg = String(e?.message || "");
    const map: Record<string, number> = {
      phone_invalid: 400,
      code_invalid: 400,
      code_wrong: 400,
      code_expired: 400,
      too_many_attempts: 429,
      unauthorized: 401,
      forbidden: 403,
      bind_token_invalid: 401,
    };
    return NextResponse.json({ error: msg || "verify_failed" }, { status: map[msg] ?? 400 });
  }
}
