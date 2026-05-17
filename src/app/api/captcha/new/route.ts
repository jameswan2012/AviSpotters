import { NextResponse } from "next/server";
import { createCaptcha } from "@/lib/captcha";
import { getClientIpFromHeaders } from "@/lib/ip";

export async function GET(request: Request) {
  const ip = getClientIpFromHeaders(request.headers);
  const userAgent = request.headers.get("user-agent");
  const c = await createCaptcha({ ip, userAgent });
  return NextResponse.json({ id: c.id, expiresAt: c.expiresAt, image: c.dataUrl });
}

