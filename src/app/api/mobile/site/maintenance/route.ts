import { NextResponse } from "next/server";
import { getMaintenanceSetting } from "@/lib/site-settings";

export async function GET() {
  const setting = await getMaintenanceSetting();
  return NextResponse.json({
    maintenance: {
      enabled: setting.enabled === true,
      message: setting.message ?? null,
    },
  });
}

