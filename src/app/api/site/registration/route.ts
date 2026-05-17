import { NextResponse } from "next/server";
import { getRegistrationSetting } from "@/lib/site-settings";

export async function GET() {
  const setting = await getRegistrationSetting();
  return NextResponse.json({
    enabled: setting.enabled,
    emailVerificationEnabled: setting.emailVerificationEnabled,
    phoneFeatureEnabled: setting.phoneFeatureEnabled,
    phoneRegistrationEnabled: setting.phoneRegistrationEnabled,
    forcePhoneLogin: setting.forcePhoneLogin,
  });
}

