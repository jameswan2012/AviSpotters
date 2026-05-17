import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { getExternalLexiconStatus, getModerationConfig, setModerationConfig } from "@/lib/moderation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 3) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const config = await getModerationConfig();
  const externalLexicon = getExternalLexiconStatus();
  return NextResponse.json({ config, externalLexicon });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(user.roleId) < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Partial<{
    enabled: boolean;
    lowWords: string[];
    highWords: string[];
    externalLexiconEnabled: boolean;
    externalLexiconLevel: "low" | "high";
    highLockMinutes: number;
    highLockMessage: string;
    autoBanIpOnHigh: boolean;
  }>;

  const config = await setModerationConfig(
    {
      enabled: body.enabled,
      lowWords: Array.isArray(body.lowWords) ? body.lowWords : undefined,
      highWords: Array.isArray(body.highWords) ? body.highWords : undefined,
      externalLexiconEnabled: body.externalLexiconEnabled,
      externalLexiconLevel: body.externalLexiconLevel,
      highLockMinutes: Number.isFinite(Number(body.highLockMinutes)) ? Number(body.highLockMinutes) : undefined,
      highLockMessage: typeof body.highLockMessage === "string" ? body.highLockMessage : undefined,
      autoBanIpOnHigh: body.autoBanIpOnHigh,
    },
    user.id
  );

  const externalLexicon = getExternalLexiconStatus();
  return NextResponse.json({ ok: true, config, externalLexicon });
}

