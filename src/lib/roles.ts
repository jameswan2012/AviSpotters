export function toRoleId(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

type RoleMeta = {
  pillClass: string;
  nameClass: string;
};

const ROLE_NAMES: Record<number, { en: string; zhHans: string; zhHant: string }> = {
  0: { en: "User", zhHans: "用户", zhHant: "用戶" },
  1: { en: "Photographer", zhHans: "摄影师", zhHant: "攝影師" },
  2: { en: "Reviewer", zhHans: "审核员", zhHant: "審核員" },
  3: { en: "Senior Reviewer", zhHans: "高级审核员", zhHant: "高級審核員" },
  4: { en: "Admin", zhHans: "管理员", zhHant: "管理員" },
  5: { en: "Super Admin", zhHans: "超级管理员", zhHant: "超級管理員" },
};

export function getRoleMeta(roleId: number): RoleMeta {
  if (roleId >= 5) {
    return {
      pillClass: "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/30 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20",
      nameClass: "text-amber-900 dark:text-amber-200",
    };
  }
  if (roleId >= 4) {
    return {
      pillClass: "bg-rose-500/15 text-rose-900 ring-1 ring-rose-500/30 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/20",
      nameClass: "text-rose-900 dark:text-rose-200",
    };
  }
  if (roleId >= 2) {
    return {
      pillClass: "bg-sky-500/15 text-sky-900 ring-1 ring-sky-500/30 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/20",
      nameClass: "text-sky-900 dark:text-sky-200",
    };
  }
  return {
    pillClass: "bg-white/50 text-slate-900 ring-1 ring-white/50 dark:bg-white/5 dark:text-white dark:ring-white/10",
    nameClass: "text-slate-900 dark:text-white",
  };
}

export function getRoleLabel(locale: string, roleId: number): string {
  const role = ROLE_NAMES[roleId] ?? ROLE_NAMES[0];
  if (locale === "en") return role.en;
  if (locale === "zh-Hans") return role.zhHans;
  return role.zhHant;
}
