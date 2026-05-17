import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { getAiReviewSettingAdminView, setAiReviewSetting } from "@/lib/site-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const setting = await getAiReviewSettingAdminView();
  return NextResponse.json({ setting });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    setting?: Partial<{ enabled: boolean; baseUrl: string; model: string; allowUploaderSelfUse: boolean }>;
    apiKey?: string | null;
    clearApiKey?: boolean;
  };
  await setAiReviewSetting({
    patch: body.setting ?? {},
    apiKeyPlain: typeof body.apiKey === "string" ? body.apiKey : body.apiKey === null ? null : undefined,
    clearApiKey: body.clearApiKey === true,
    updatedById: user.id,
  });
  const setting = await getAiReviewSettingAdminView();
  return NextResponse.json({ ok: true, setting });
}
