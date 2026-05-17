"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailVerifyPanel } from "@/components/account/EmailVerifyPanel";
import { SmsVerifyPanel } from "@/components/account/SmsVerifyPanel";
import { useClientLocale } from "@/i18n/client-locale";
import { AuthFeaturedCarousel } from "@/components/auth/AuthFeaturedCarousel";

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone: string;
  captchaId: string;
  captchaCode: string;
};

export default function RegisterVerifyPage() {
  const router = useRouter();
  const locale = useClientLocale();
  const [payload, setPayload] = useState<RegisterPayload | null>(null);
  const [emailGrantId, setEmailGrantId] = useState<string | null>(null);
  const [smsGrantId, setSmsGrantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneFeatureEnabled, setPhoneFeatureEnabled] = useState(true);

  function goBlocked(data: { email?: string | null; bannedUntil?: string | null; permanent?: boolean }) {
    const p = new URLSearchParams();
    if (data.email) p.set("email", String(data.email));
    if (data.bannedUntil) p.set("until", String(data.bannedUntil));
    if (data.permanent) p.set("permanent", "1");
    router.replace(`/auth/blocked?${p.toString()}`);
  }

  const needEmail = true;
  const needPhone = phoneFeatureEnabled && !!payload?.phone;

  const canSubmit = useMemo(() => {
    if (!payload) return false;
    if (needEmail && !emailGrantId) return false;
    if (needPhone && !smsGrantId) return false;
    return true;
  }, [payload, needEmail, needPhone, emailGrantId, smsGrantId]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("avispotters_register_payload");
      if (!raw) {
        router.replace("/auth/register");
        return;
      }
      const json = JSON.parse(raw) as RegisterPayload;
      if (!json?.name || !json?.password || !json?.email) {
        router.replace("/auth/register");
        return;
      }
      setPayload(json);
    } catch {
      router.replace("/register");
    }
  }, [router]);

  useEffect(() => {
    let stopped = false;
    (async () => {
      try {
        const res = await fetch("/api/site/registration", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as any;
        if (!stopped) setPhoneFeatureEnabled(json?.phoneFeatureEnabled !== false);
      } catch {
        if (!stopped) setPhoneFeatureEnabled(false);
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);

  async function completeRegister() {
    if (!payload) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email || null,
          password: payload.password,
          phone: phoneFeatureEnabled ? (payload.phone || null) : null,
          verifyGrantId: emailGrantId,
          smsGrantId,
          captchaId: payload.captchaId,
          captchaCode: payload.captchaCode,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        if (data?.code === "account_banned" || data?.error === "account_banned") {
          goBlocked({
            email: data?.email || payload.email || null,
            bannedUntil: data?.bannedUntil || null,
            permanent: !!data?.permanent,
          });
          return;
        }
        setError(String(data?.error || "register_failed"));
        return;
      }
      window.sessionStorage.removeItem("avispotters_register_payload");
      window.location.href = "/dashboard";
    } catch {
      setError(
        locale === "en"
          ? "Registration failed. Please try again."
          : locale === "zh-Hans"
            ? "注册失败，请重试。"
            : "註冊失敗，請重試。"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!payload) return null;

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <AuthFeaturedCarousel variant="backdrop" />
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col justify-center px-4 py-12 sm:py-16">
        <div className="space-y-4 rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl shadow-slate-900/10 backdrop-blur-sm dark:border-white/10 dark:bg-sky-950/90 dark:shadow-black/40">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {locale === "en" ? "Verify and create account" : locale === "zh-Hans" ? "验证并创建账号" : "驗證並建立帳號"}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {locale === "en"
                ? "Complete verification for the contact methods you entered."
                : locale === "zh-Hans"
                  ? "完成你填写联系方式的验证码。"
                  : "完成你填寫聯絡方式的驗證碼。"}
            </p>
          </div>

          {needEmail ? (
            <EmailVerifyPanel
              purpose="register"
              email={payload.email.trim().toLowerCase()}
              onVerified={(r) => {
                if (r.grantId) setEmailGrantId(r.grantId);
              }}
            />
          ) : null}

          {needPhone ? (
            <SmsVerifyPanel
              purpose="register"
              phone={payload.phone}
              captchaId={payload.captchaId}
              captchaCode={payload.captchaCode}
              onVerified={(r) => {
                if (r.grantId) setSmsGrantId(r.grantId);
              }}
            />
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-100">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push("/auth/register")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {locale === "en" ? "Back" : locale === "zh-Hans" ? "返回" : "返回"}
            </button>
            <button
              type="button"
              disabled={!canSubmit || loading}
              onClick={() => void completeRegister()}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {loading
                ? locale === "en"
                  ? "Creating..."
                  : locale === "zh-Hans"
                    ? "创建中..."
                    : "建立中..."
                : locale === "en"
                  ? "Create account"
                  : locale === "zh-Hans"
                    ? "创建账号"
                    : "建立帳號"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

