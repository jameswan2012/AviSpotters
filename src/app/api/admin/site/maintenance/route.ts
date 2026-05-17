import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { getMaintenanceSetting, setMaintenanceSetting } from "@/lib/site-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const setting = await getMaintenanceSetting();
  return NextResponse.json({ maintenance: setting });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json()) as Partial<{ enabled: boolean; message: string | null }>;
  const enabled = body.enabled === true;
  const message = body.message == null ? undefined : String(body.message);

  await setMaintenanceSetting({ enabled, message, updatedById: user.id });
  return NextResponse.json({ ok: true });
}

