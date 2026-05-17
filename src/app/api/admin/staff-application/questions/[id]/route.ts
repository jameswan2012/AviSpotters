import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await requireSuperAdmin();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { order?: number; active?: boolean; promptJson?: string };
  const order = typeof body.order === "number" && Number.isFinite(body.order) ? Math.trunc(body.order) : 0;
  const active = body.active !== false;
  const promptJson = typeof body.promptJson === "string" ? body.promptJson : "";
  if (!promptJson || promptJson.length > 20_000) return NextResponse.json({ error: "prompt_required" }, { status: 400 });

  await prisma.staffApplicationQuestion.update({
    where: { id },
    data: { order, active, promptJson, updatedById: user.id },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  await prisma.staffApplicationQuestion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

