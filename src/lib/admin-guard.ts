import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

function normalizeRoleId(roleId: number | null | undefined) {
  return Number.isFinite(Number(roleId)) ? Number(roleId) : 0;
}

async function requireBaseAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const roleId = normalizeRoleId(user.roleId);
  if (roleId < 2) redirect("/dashboard");
  return { user, roleId };
}

export async function requireStaff() {
  return requireBaseAdmin();
}

export async function requireAdmin() {
  const { user, roleId } = await requireBaseAdmin();
  if (roleId < 4) redirect("/admin");
  return { user, roleId };
}

export async function requireSuperAdmin() {
  const { user, roleId } = await requireBaseAdmin();
  if (roleId < 5) redirect("/admin");
  return { user, roleId };
}
