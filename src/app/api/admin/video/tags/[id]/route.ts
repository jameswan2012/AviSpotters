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

// GET /api/admin/video/tags/[id] - 获取单个标签
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const tag = await prisma.videoTag.findUnique({ where: { id } });

  if (!tag) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ tag });
}

// PUT /api/admin/video/tags/[id] - 更新标签
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { name, isActive } = body;

  const existingTag = await prisma.videoTag.findUnique({ where: { id } });
  if (!existingTag) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 检查名称是否与其他标签重复
  if (name && name.trim() !== existingTag.name) {
    const duplicate = await prisma.videoTag.findUnique({ where: { name: name.trim() } });
    if (duplicate) {
      return NextResponse.json({ error: "tag name already exists" }, { status: 400 });
    }
  }

  const tag = await prisma.videoTag.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(typeof isActive === "boolean" && { isActive }),
    },
  });

  return NextResponse.json({ tag });
}

// DELETE /api/admin/video/tags/[id] - 删除标签
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;

  const existingTag = await prisma.videoTag.findUnique({ where: { id } });
  if (!existingTag) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.videoTag.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
