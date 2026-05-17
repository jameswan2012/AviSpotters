import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { getDynamicWatermarkSetting, setDynamicWatermarkSetting, type DynamicWatermarkSetting } from "@/lib/site-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const setting = await getDynamicWatermarkSetting();
  return NextResponse.json({ setting });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { setting?: Partial<DynamicWatermarkSetting> };
  const cur = await getDynamicWatermarkSetting();
  const next = { ...cur, ...(body.setting ?? {}) } as DynamicWatermarkSetting;
  await setDynamicWatermarkSetting({ setting: next, updatedById: user.id });
  return NextResponse.json({ ok: true });
}

