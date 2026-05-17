import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { consumeGrant } from "@/lib/email-verify";
import { createSession, setSessionCookie } from "@/lib/auth";
import { getClientIpFromHeaders } from "@/lib/ip";
import { createLowRiskIncident, enforceHighRiskAction, getModerationConfig, matchModeration } from "@/lib/moderation";
import { isNicknameTaken, normalizeNickname, validateNicknameFormat } from "@/lib/nickname";
import { consumeSmsGrant } from "@/lib/phone-verify";
import { normalizePhone } from "@/lib/phone-util";
import { getRegistrationSetting } from "@/lib/site-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      profileBio: true,
      avatarUpdatedAt: true,
      backgroundUpdatedAt: true,
      email2faEnabled: true,
    },
  });
  if (!db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: {
      id: db.id,
      email: db.email,
      phone: db.phone,
      name: db.name,
      profileBio: db.profileBio,
      avatarUrl: db.avatarUpdatedAt ? `/api/users/${encodeURIComponent(db.id)}/avatar?v=${db.avatarUpdatedAt.getTime()}` : null,
      backgroundUrl: db.backgroundUpdatedAt ? `/api/users/${encodeURIComponent(db.id)}/background?v=${db.backgroundUpdatedAt.getTime()}` : null,
      email2faEnabled: db.email2faEnabled,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "content_type_invalid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    name?: string | null;
    profileBio?: string | null;
    verifyGrantId?: string;
    smsVerifyGrantId?: string;
    phone?: string | null;
    email2faEnabled?: boolean;
  };
  {
    const allowedKeys = new Set(["email", "name", "profileBio", "verifyGrantId", "smsVerifyGrantId", "phone", "email2faEnabled"]);
    const extra = Object.keys((body || {}) as Record<string, unknown>).filter((k) => !allowedKeys.has(k));
    if (extra.length) return NextResponse.json({ error: "unexpected_parameters" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const name = typeof body.name === "string" ? body.name.trim() || null : body.name === null ? null : null;
  const profileBio =
    typeof body.profileBio === "string" ? body.profileBio.slice(0, 2000) : body.profileBio === null ? null : undefined;
  const email2faEnabled = typeof body.email2faEnabled === "boolean" ? body.email2faEnabled : undefined;
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : body.phone === null ? null : null;

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  try {
    const before = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, phone: true, name: true, email2faEnabled: true },
    });
    if (!before) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const emailChanged = before.email !== email;
    const phoneChanged = (before.phone ?? null) !== (phone ?? null);
    const nameChanged = (before.name ?? null) !== (name ?? null);
    const reg = await getRegistrationSetting();

    const requireEmail2fa = before.email2faEnabled === true;

    if (emailChanged) {
      try {
        await consumeGrant({
          grantId: String(body.verifyGrantId ?? ""),
          purpose: "change_email",
          userId: user.id,
          email,
          metadataMatch: (metadataJson) => {
            try {
              const j = metadataJson ? JSON.parse(metadataJson) : null;
              const newEmail = String(j?.newEmail ?? "").trim().toLowerCase();
              return !!newEmail && newEmail === email;
            } catch {
              return false;
            }
          },
        });
      } catch {
        return NextResponse.json({ error: "email_verify_required" }, { status: 409 });
      }
    } else if (requireEmail2fa && nameChanged) {
      try {
        await consumeGrant({
          grantId: String(body.verifyGrantId ?? ""),
          purpose: "change_name",
          userId: user.id,
          email: before.email,
        });
      } catch {
        return NextResponse.json({ error: "email_verify_required" }, { status: 409 });
      }
    }
    if (phoneChanged) {
      if (!reg.phoneFeatureEnabled) {
        return NextResponse.json({ error: "phone_feature_disabled" }, { status: 403 });
      }
      if (!phone) {
        return NextResponse.json({ error: "phone_required" }, { status: 400 });
      }
      try {
        await consumeSmsGrant({
          grantId: String(body.smsVerifyGrantId ?? ""),
          purpose: "change_phone",
          userId: user.id,
          phone,
        });
      } catch {
        return NextResponse.json({ error: "phone_verify_required" }, { status: 409 });
      }
    }

    const normalizedName = name ? normalizeNickname(name) : null;
    if (normalizedName) {
      const fmt = validateNicknameFormat(normalizedName);
      if (!fmt.ok) return NextResponse.json({ error: "nickname_invalid" }, { status: 400 });
      const taken = await isNicknameTaken(normalizedName, { excludeUserId: user.id });
      if (taken) return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
    }

    const moderation = await getModerationConfig();
    const ip = getClientIpFromHeaders(request.headers);
    const profileText = `${normalizedName ?? ""}\n${typeof profileBio === "string" ? profileBio : ""}`.trim();
    const hit = matchModeration(profileText, moderation);
    if (hit.level === "high") {
      await enforceHighRiskAction({
        userId: user.id,
        ip,
        source: "account_profile_update",
        text: profileText,
        matches: hit.matches,
        config: moderation,
      });
      return NextResponse.json({ error: moderation.highLockMessage }, { status: 403 });
    }
    if (hit.level === "low") {
      await createLowRiskIncident({
        userId: user.id,
        ip,
        source: "account_profile_update",
        text: profileText,
        matches: hit.matches,
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        phone,
        phoneVerifiedAt: phoneChanged && phone ? new Date() : phoneChanged ? null : undefined,
        name: hit.level === "low" ? null : normalizedName,
        ...(profileBio !== undefined ? { profileBio: hit.level === "low" ? null : profileBio } : {}),
        ...(email2faEnabled !== undefined ? { email2faEnabled } : {}),
      },
      select: { id: true, email: true, name: true, profileBio: true, email2faEnabled: true },
    });

    // Refresh session token if email changed (JWT payload contains email).
    if (emailChanged) {
      const token = await createSession(updated.id, updated.email);
      await setSessionCookie(token);
    }

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    // Prisma unique constraint
    if (String(e?.code) === "P2002") {
      return NextResponse.json({ error: "此 Email 已被使用" }, { status: 409 });
    }
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

