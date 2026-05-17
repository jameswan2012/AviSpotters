import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { sendMail } from "@/lib/mailer";
import { buildAnnouncementEmail, buildMaintenanceEmail } from "@/lib/email-template";
import { resolveLocale } from "@/i18n/shared";

function resolveBaseUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

type TargetMode = "all" | "roles" | "users";
type TemplateType = "custom" | "maintenance";

function cleanString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function uniq<T>(arr: T[]) {
  return [...new Set(arr)];
}

function validRoleIds(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return uniq(
    input
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 4)
      .map((n) => toRoleId(n))
  );
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (toRoleId(actor.roleId) < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    mode?: TargetMode;
    roleIds?: number[];
    userIds?: string[];
    template?: TemplateType;
    locale?: string;
    subject?: string;
    content?: string;
    maintenanceStartAt?: string | null;
    maintenanceEndAt?: string | null;
  };

  const mode: TargetMode = body.mode === "all" || body.mode === "roles" || body.mode === "users" ? body.mode : "all";
  const template: TemplateType = body.template === "maintenance" ? "maintenance" : "custom";
  const locale = resolveLocale(body.locale);
  const subject = cleanString(body.subject);
  const content = cleanString(body.content);
  const roleIds = validRoleIds(body.roleIds);
  const userIds = Array.isArray(body.userIds) ? uniq(body.userIds.map((x) => cleanString(x)).filter(Boolean)) : [];
  const maintenanceStartAt = cleanString(body.maintenanceStartAt);
  const maintenanceEndAt = cleanString(body.maintenanceEndAt);

  if (!subject) return NextResponse.json({ error: "subject_required" }, { status: 400 });
  if (!content) return NextResponse.json({ error: "content_required" }, { status: 400 });
  if (mode === "roles" && roleIds.length === 0) return NextResponse.json({ error: "roles_required" }, { status: 400 });
  if (mode === "users" && userIds.length === 0) return NextResponse.json({ error: "users_required" }, { status: 400 });

  const where =
    mode === "all"
      ? { deletedAt: null as null }
      : mode === "roles"
        ? { deletedAt: null as null, roleId: { in: roleIds } }
        : { deletedAt: null as null, id: { in: userIds } };

  const targets = await prisma.user.findMany({
    where,
    select: { id: true, email: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  if (!targets.length) return NextResponse.json({ error: "no_targets" }, { status: 400 });

  const mail =
    template === "maintenance"
      ? buildMaintenanceEmail({
          locale,
          subject,
          message: content,
          startAtIso: maintenanceStartAt || null,
          endAtIso: maintenanceEndAt || null,
          logoUrl: `${resolveBaseUrl()}/api/site/logo?variant=light`,
        })
      : buildAnnouncementEmail({ locale, subject, content, logoUrl: `${resolveBaseUrl()}/api/site/logo?variant=light` });

  let sent = 0;
  let failed = 0;
  const failures: string[] = [];
  const batchSize = 20;
  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((u) =>
        sendMail({
          to: u.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        })
      )
    );
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") sent += 1;
      else {
        failed += 1;
        if (failures.length < 8) failures.push(`${batch[idx]?.email || "unknown"}: ${String((r.reason as any)?.message || "send_failed")}`);
      }
    });
  }

  return NextResponse.json({
    ok: true,
    summary: {
      mode,
      template,
      total: targets.length,
      sent,
      failed,
      failures,
    },
  });
}
