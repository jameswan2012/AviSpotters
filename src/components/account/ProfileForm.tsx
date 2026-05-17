"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/i18n/t";
import { useClientLocale } from "@/i18n/client-locale";
import { EmailVerifyPanel, type EmailVerifyPurpose } from "@/components/account/EmailVerifyPanel";
import { SmsVerifyPanel } from "@/components/account/SmsVerifyPanel";

export function ProfileForm() {
  const router = useRouter();
  const locale = useClientLocale();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [origEmail, setOrigEmail] = useState<string>("");
  const [origPhone, setOrigPhone] = useState<string>("");
  const [origName, setOrigName] = useState<string>("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [email2faEnabled, setEmail2faEnabled] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [phoneFeatureEnabled, setPhoneFeatureEnabled] = useState(true);

  const [profileVerifyPurpose, setProfileVerifyPurpose] = useState<EmailVerifyPurpose | null>(null);
  const [profileVerifyEmail, setProfileVerifyEmail] = useState<string>("");
  const [profileVerifyGrantId, setProfileVerifyGrantId] = useState<string | null>(null);
  const [smsVerifyGrantId, setSmsVerifyGrantId] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwVerifyGrantId, setPwVerifyGrantId] = useState<string | null>(null);
  const [pwChanging, setPwChanging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/account/profile");
        const json = (await res.json()) as {
          user?: {
            email: string;
            phone?: string | null;
            name: string | null;
            profileBio?: string | null;
            avatarUrl?: string | null;
            backgroundUrl?: string | null;
            email2faEnabled?: boolean;
          };
          error?: string;
        };
        if (!res.ok || !json.user) throw new Error(json.error || "讀取失敗");
        if (cancelled) return;
        setEmail(json.user.email);
        setPhone(json.user.phone ?? "");
        setName(json.user.name ?? "");
        setOrigEmail(json.user.email);
        setOrigPhone(json.user.phone ?? "");
        setOrigName(json.user.name ?? "");
        setProfileBio(json.user.profileBio ?? "");
        setEmail2faEnabled(json.user.email2faEnabled !== false);
        setAvatarUrl(json.user.avatarUrl ?? null);
        setBackgroundUrl(json.user.backgroundUrl ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "讀取失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/site/registration", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as any;
        if (!cancelled) setPhoneFeatureEnabled(json?.phoneFeatureEnabled !== false);
      } catch {
        if (!cancelled) setPhoneFeatureEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const newEmail = email.trim().toLowerCase();
    const newPhone = phone.trim();
    const newName = name.trim();
    const emailChanged = !!origEmail && newEmail !== origEmail.trim().toLowerCase();
    const nameChanged = (origName ?? "") !== newName;
    const phoneChanged = (origPhone ?? "") !== newPhone;

    const nextPurpose: EmailVerifyPurpose | null =
      emailChanged ? "change_email" : email2faEnabled && nameChanged ? "change_name" : null;
    const nextEmail = emailChanged ? newEmail : origEmail;

    if (nextPurpose !== profileVerifyPurpose || nextEmail !== profileVerifyEmail) {
      setProfileVerifyPurpose(nextPurpose);
      setProfileVerifyEmail(nextEmail || "");
      setProfileVerifyGrantId(null);
    }
    if (phoneChanged) setSmsVerifyGrantId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, phone, name, origEmail, origPhone, origName, email2faEnabled]);

  async function onSave() {
    setError(null);
    setOk(null);

    const confirmed = window.confirm(t(locale, "profile.confirm.watermarkUnchanged"));
    if (!confirmed) return;

    try {
      setSaving(true);
      const needsVerify = !!profileVerifyPurpose;
      if (needsVerify && !profileVerifyGrantId) {
        throw new Error(locale === "en" ? "Email verification required." : locale === "zh-Hans" ? "需要邮箱验证。" : "需要 Email 驗證。");
      }
      if (phoneFeatureEnabled && phone.trim() !== (origPhone ?? "") && !smsVerifyGrantId) {
        throw new Error(locale === "en" ? "Phone verification required." : locale === "zh-Hans" ? "需要手机验证。" : "需要手機驗證。");
      }
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          phone: phoneFeatureEnabled ? (phone.trim() || null) : (origPhone || null),
          name: name.trim() || null,
          profileBio: profileBio.trim() || null,
          verifyGrantId: profileVerifyGrantId,
          smsVerifyGrantId,
          email2faEnabled,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || t(locale, "profile.saveFailed"));
      setOk(t(locale, "profile.saved"));
      setOrigEmail(email.trim().toLowerCase());
      setOrigPhone(phone.trim());
      setOrigName(name.trim());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-700 dark:text-slate-200">{t(locale, "profile.loading")}</div>;

  async function upload(file: File, kind: "avatar" | "background") {
    if (!file) return;
    setError(null);
    setOk(null);
    const isAvatar = kind === "avatar";
    try {
      if (isAvatar) setUploadingAvatar(true);
      else setUploadingBg(true);
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(isAvatar ? "/api/account/avatar" : "/api/account/background", { method: "POST", body: fd });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }
      if (!res.ok) throw new Error(json.error || t(locale, "profile.saveFailed"));
      if (isAvatar) setAvatarUrl(json.avatarUrl ?? null);
      else setBackgroundUrl(json.backgroundUrl ?? null);
      setOk(t(locale, "profile.saved"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "profile.saveFailed"));
    } finally {
      if (isAvatar) setUploadingAvatar(false);
      else setUploadingBg(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
      {ok ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{ok}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">
          {locale === "en" ? "Profile media" : locale === "zh-Hans" ? "主页图片" : "主頁圖片"}
        </div>
        <div className="mt-2 text-xs text-slate-600 dark:text-slate-200">
          {locale === "en"
            ? "Avatar: JPG/PNG ≤ 1MB. Super Admin can upload GIF ≤ 15MB."
            : locale === "zh-Hans"
              ? "头像：JPG/PNG ≤ 1MB，高级管理员可上传 GIF ≤ 15MB。"
              : "頭像：JPG/PNG ≤ 1MB，高級管理員可上傳 GIF ≤ 15MB。"}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 dark:border-white/10 dark:bg-sky-950/30">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{locale === "en" ? "Avatar" : locale === "zh-Hans" ? "头像" : "頭像"}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs font-extrabold text-slate-500 dark:text-slate-200">
                    {(name || email || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,.jpg,.jpeg,.png,.gif"
                disabled={uploadingAvatar}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f) void upload(f, "avatar");
                  e.currentTarget.value = "";
                }}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-950 hover:file:bg-sky-400 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 dark:border-white/10 dark:bg-sky-950/30">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{locale === "en" ? "Background" : locale === "zh-Hans" ? "背景图" : "背景圖"}</div>
            <div className="mt-3 space-y-3">
              <div className="h-20 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                {backgroundUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={backgroundUrl} alt="background" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs font-semibold text-slate-500 dark:text-slate-200">
                    {locale === "en" ? "No background" : locale === "zh-Hans" ? "暂无背景图" : "暫無背景圖"}
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,.jpg,.jpeg,.png,.gif"
                disabled={uploadingBg}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f) void upload(f, "background");
                  e.currentTarget.value = "";
                }}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-950 hover:file:bg-sky-400 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              />
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                {locale === "en" ? "JPG/PNG ≤ 5MB. Super Admin can use GIF ≤ 15MB." : locale === "zh-Hans" ? "JPG/PNG ≤ 5MB，高级管理员可用 GIF ≤ 15MB。" : "JPG/PNG ≤ 5MB，高級管理員可用 GIF ≤ 15MB。"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(locale, "profile.title")}</div>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-sky-50 p-4 dark:border-white/10 dark:bg-sky-950/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {locale === "en" ? "Email 2FA (optional)" : locale === "zh-Hans" ? "邮箱双重验证（可关闭）" : "Email 雙重驗證（可關閉）"}
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {locale === "en"
                  ? "You can disable email verification for profile edits. Deactivation & password change are always required."
                  : locale === "zh-Hans"
                    ? "你可以关闭修改资料时的邮箱验证；但注销与改密码仍强制邮箱验证。"
                    : "你可以關閉修改資料時的 Email 驗證；但註銷與改密碼仍強制 Email 驗證。"}
              </div>
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={email2faEnabled}
                onChange={(e) => setEmail2faEnabled(e.target.checked)}
                disabled={saving}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {email2faEnabled
                  ? locale === "en"
                    ? "Enabled"
                    : locale === "zh-Hans"
                      ? "已开启"
                      : "已開啟"
                  : locale === "en"
                    ? "Disabled"
                    : locale === "zh-Hans"
                      ? "已关闭"
                      : "已關閉"}
              </span>
            </label>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{t(locale, "profile.email")}</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              placeholder="you@example.com"
            />
          </label>
          {phoneFeatureEnabled ? (
            <label className="block">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                {locale === "en" ? "Phone" : locale === "zh-Hans" ? "手机号" : "手機號"}
              </div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
                placeholder="+8613800138000"
              />
            </label>
          ) : null}
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{t(locale, "profile.name")}</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              placeholder={t(locale, "profile.namePlaceholder")}
            />
          </label>
        </div>

        {profileVerifyPurpose ? (
          <div className="mt-4">
            <EmailVerifyPanel
              purpose={profileVerifyPurpose}
              email={profileVerifyEmail}
              disabled={saving}
              onVerified={(r) => {
                if (r.grantId) setProfileVerifyGrantId(r.grantId);
              }}
            />
          </div>
        ) : null}
        {phoneFeatureEnabled && phone.trim() !== (origPhone ?? "") && phone.trim() ? (
          <div className="mt-4">
            <SmsVerifyPanel
              purpose="change_phone"
              phone={phone.trim()}
              captchaId={null}
              captchaCode=""
              disabled={saving}
              onVerified={(r) => {
                if (r.grantId) setSmsVerifyGrantId(r.grantId);
              }}
            />
          </div>
        ) : null}

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            {locale === "en" ? "Profile bio (max 2000)" : locale === "zh-Hans" ? "主页介绍（最多 2000 字）" : "主頁介紹（最多 2000 字）"}
          </div>
          <textarea
            value={profileBio}
            onChange={(e) => setProfileBio(e.target.value.slice(0, 2000))}
            rows={6}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            placeholder={locale === "en" ? "Write something about yourself…" : locale === "zh-Hans" ? "写一点自我介绍…" : "寫一點自我介紹…"}
          />
          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
            {profileBio.length} / 2000
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || (!!profileVerifyPurpose && !profileVerifyGrantId) || (phoneFeatureEnabled && phone.trim() !== (origPhone ?? "") && !smsVerifyGrantId)}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? t(locale, "profile.saving") : t(locale, "profile.save")}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{locale === "en" ? "Change password" : locale === "zh-Hans" ? "修改密码" : "修改密碼"}</div>
        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {locale === "en" ? "Requires email verification + current password." : locale === "zh-Hans" ? "需要邮箱验证 + 当前密码。" : "需要 Email 驗證 + 目前密碼。"}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{locale === "en" ? "Current password" : locale === "zh-Hans" ? "当前密码" : "目前密碼"}</div>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{locale === "en" ? "New password" : locale === "zh-Hans" ? "新密码" : "新密碼"}</div>
            <input
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPwVerifyGrantId(null);
              }}
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{locale === "en" ? "Confirm" : locale === "zh-Hans" ? "确认新密码" : "確認新密碼"}</div>
            <input
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="mt-4">
          <EmailVerifyPanel
            purpose="change_password"
            email={origEmail}
            disabled={pwChanging || saving}
            onVerified={(r) => {
              if (r.grantId) setPwVerifyGrantId(r.grantId);
            }}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={
              pwChanging ||
              saving ||
              !pwVerifyGrantId ||
              !currentPassword ||
              !newPassword ||
              newPassword.length < 6 ||
              newPassword !== newPassword2
            }
            onClick={async () => {
              setError(null);
              setOk(null);
              setPwChanging(true);
              try {
                const res = await fetch("/api/account/password", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ currentPassword, newPassword, verifyGrantId: pwVerifyGrantId }),
                });
                const json = (await res.json().catch(() => ({}))) as any;
                if (!res.ok) throw new Error(json?.error || (locale === "en" ? "Change failed" : locale === "zh-Hans" ? "修改失败" : "修改失敗"));
                setOk(locale === "en" ? "Password changed." : locale === "zh-Hans" ? "密码已修改。" : "密碼已修改。");
                setCurrentPassword("");
                setNewPassword("");
                setNewPassword2("");
                setPwVerifyGrantId(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : locale === "en" ? "Change failed" : locale === "zh-Hans" ? "修改失败" : "修改失敗");
              } finally {
                setPwChanging(false);
              }
            }}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {pwChanging ? (locale === "en" ? "Changing…" : locale === "zh-Hans" ? "修改中…" : "修改中…") : locale === "en" ? "Change password" : locale === "zh-Hans" ? "修改密码" : "修改密碼"}
          </button>
        </div>

        {newPassword && newPassword.length < 6 ? (
          <div className="mt-2 text-xs text-amber-700 dark:text-amber-200">
            {locale === "en" ? "Password must be at least 6 characters." : locale === "zh-Hans" ? "密码至少 6 位。" : "密碼至少 6 碼。"}
          </div>
        ) : null}
        {newPassword2 && newPassword !== newPassword2 ? (
          <div className="mt-2 text-xs text-amber-700 dark:text-amber-200">
            {locale === "en" ? "Passwords do not match." : locale === "zh-Hans" ? "两次密码不一致。" : "兩次密碼不一致。"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

