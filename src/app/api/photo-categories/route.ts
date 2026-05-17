import { NextResponse } from "next/server";
import { getPhotoCategorySetting } from "@/lib/site-settings";

export async function GET() {
  const setting = await getPhotoCategorySetting();
  return NextResponse.json({ setting });
}

