import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { getAiTrainingSetting, setAiTrainingSetting } from "@/lib/site-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const setting = await getAiTrainingSetting();
  return NextResponse.json({ setting });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Partial<{ enabled: boolean }>;
  await setAiTrainingSetting({ enabled: body.enabled === true, updatedById: user.id });
  return NextResponse.json({ ok: true, setting: { enabled: body.enabled === true } });
}
