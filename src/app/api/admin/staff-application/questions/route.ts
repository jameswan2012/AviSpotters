import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

export async function GET() {
  await requireSuperAdmin();
  const questions = await prisma.staffApplicationQuestion.findMany({
    orderBy: [{ active: "desc" }, { order: "asc" }, { createdAt: "asc" }],
    select: { id: true, order: true, active: true, promptJson: true, imagePath: true, imageMime: true, imageSizeBytes: true, updatedAt: true },
  });
  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  const { user } = await requireSuperAdmin();
  const body = (await req.json().catch(() => ({}))) as { order?: number; active?: boolean; promptJson?: string };
  const order = typeof body.order === "number" && Number.isFinite(body.order) ? Math.trunc(body.order) : 0;
  const active = body.active !== false;
  const promptJson = typeof body.promptJson === "string" ? body.promptJson : "";
  if (!promptJson || promptJson.length > 20_000) return NextResponse.json({ error: "prompt_required" }, { status: 400 });

  const q = await prisma.staffApplicationQuestion.create({
    data: { order, active, promptJson, updatedById: user.id },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: q.id });
}

