import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await ctx.params;
  const row = await prisma.pageContent.findUnique({ where: { slug } });
  return NextResponse.json({ page: row });
}

export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { user } = await requireAdmin();
  const { slug } = await ctx.params;
  const body = (await request.json()) as { contentJson?: string };
  const contentJson = String(body.contentJson ?? "").trim();
  if (!contentJson) {
    return NextResponse.json({ error: "contentJson required" }, { status: 400 });
  }

  // validate JSON
  try {
    JSON.parse(contentJson);
  } catch {
    return NextResponse.json({ error: "contentJson must be valid JSON" }, { status: 400 });
  }

  const page = await prisma.pageContent.upsert({
    where: { slug },
    create: { slug, contentJson, updatedById: user.id },
    update: { contentJson, updatedById: user.id },
  });

  return NextResponse.json({ page });
}

