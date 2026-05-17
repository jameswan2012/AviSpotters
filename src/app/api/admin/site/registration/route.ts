import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { getRegistrationSetting, setRegistrationSetting } from "@/lib/site-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const setting = await getRegistrationSetting();
  return NextResponse.json({ registration: setting });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Partial<{
    enabled: boolean;
    emailVerificationEnabled: boolean;
    phoneFeatureEnabled: boolean;
    phoneRegistrationEnabled: boolean;
    forcePhoneLogin: boolean;
  }>;
  const enabled = body.enabled === true;
  const emailVerificationEnabled = body.emailVerificationEnabled !== false;
  const phoneFeatureEnabled = body.phoneFeatureEnabled !== false;
  const phoneRegistrationEnabled = phoneFeatureEnabled && body.phoneRegistrationEnabled === true;
  const forcePhoneLogin = phoneFeatureEnabled && body.forcePhoneLogin !== false;
  await setRegistrationSetting({
    enabled,
    emailVerificationEnabled,
    phoneFeatureEnabled,
    phoneRegistrationEnabled,
    forcePhoneLogin,
    updatedById: user.id,
  });
  return NextResponse.json({ ok: true });
}

