import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import {
  getEmailDeliverySettingAdminView,
  getEmailSmtpSettingAdminView,
  setEmailDeliverySetting,
  setEmailSmtpSetting,
  type EmailDeliveryProvider,
} from "@/lib/site-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const setting = await getEmailSmtpSettingAdminView();
  const delivery = await getEmailDeliverySettingAdminView();
  return NextResponse.json({ setting, delivery });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    setting?: Partial<{ enabled: boolean; host: string; port: number; user: string; from: string }>;
    password?: string | null;
    clearPassword?: boolean;
    delivery?: Partial<{ provider: EmailDeliveryProvider; resendFrom: string }>;
    resendApiKey?: string | null;
    clearResendApiKey?: boolean;
  };

  const patch = body.setting ?? {};
  const passwordPlain = typeof body.password === "string" ? body.password : body.password === null ? null : undefined;
  const clearPassword = body.clearPassword === true;
  const deliveryPatch = body.delivery ?? {};
  const resendApiKeyPlain =
    typeof body.resendApiKey === "string" ? body.resendApiKey : body.resendApiKey === null ? null : undefined;
  const clearResendApiKey = body.clearResendApiKey === true;

  await setEmailSmtpSetting({
    patch,
    passwordPlain,
    clearPassword,
    updatedById: user.id,
  });
  await setEmailDeliverySetting({
    patch: deliveryPatch,
    resendApiKeyPlain,
    clearResendApiKey,
    updatedById: user.id,
  });
  const setting = await getEmailSmtpSettingAdminView();
  const delivery = await getEmailDeliverySettingAdminView();
  return NextResponse.json({ ok: true, setting, delivery });
}

