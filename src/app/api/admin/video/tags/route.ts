import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toRoleId } from "@/lib/roles";

async function requireStaff() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, roleId: true, name: true, email: true } });
  if (!user) return null;
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return null;
  return { user, roleId };
}

// GET /api/admin/video/tags - 获取标签列表
export async function GET(request: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const isActive = searchParams.get("isActive");
  const q = (searchParams.get("q") ?? "").trim();

  const where: any = {};
  if (isActive !== null) where.isActive = isActive === "true";
  if (q) where.name = { contains: q };

  const tags = await prisma.videoTag.findMany({
    where,
    orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    take: 100,
  });

  return NextResponse.json({ tags });
}

// POST /api/admin/video/tags - 创建标签
export async function POST(request: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const trimmedName = name.trim();

  const existing = await prisma.videoTag.findUnique({ where: { name: trimmedName } });
  if (existing) {
    return NextResponse.json({ error: "tag already exists" }, { status: 400 });
  }

  const tag = await prisma.videoTag.create({
    data: { name: trimmedName },
  });

  return NextResponse.json({ tag });
}
