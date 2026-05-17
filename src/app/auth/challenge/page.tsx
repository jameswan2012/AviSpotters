"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClientLocale } from "@/i18n/client-locale";
import { SmsVerifyPanel } from "@/components/account/SmsVerifyPanel";

function safeDeviceId() {
  try {
    const k = "avispotters_device_id";
    const cur = window.localStorage.getItem(k);
    if (cur && cur.length >= 16) return cur;
    const id = (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(k, id);
    return id;
  } catch {
    return "";
  }
}

function AuthChallengeInner() {
  const router = useRouter();
  const search = useSearchParams();
  const locale = useClientLocale();
  const mode = String(search.get("mode") || "");

  const [deviceId, setDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [captchaImg, setCaptchaImg] = useState<string | null>(null);
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [phoneFeatureEnabled, setPhoneFeatureEnabled] = useState(true);

  const challengeId = String(search.get("challengeId") || "");
  const bindToken = String(search.get("bindToken") || "");

  const tr = useMemo(
    () => (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant),
    [locale]
  );

  async function refreshCaptcha() {
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/captcha/new", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as any;
      if (res.ok && json?.id && json?.image) {
        setCaptchaId(String(json.id));
        setCaptchaImg(String(json.image));
        setCaptchaCode("");
      }
    } finally {
      setCaptchaLoading(false);
    }
  }

  useEffect(() => {
    setDeviceId(safeDeviceId());
    if (mode === "phone_bind") void refreshCaptcha();
  }, [mode]);

  useEffect(() => {
    let stopped = false;
    (async () => {
      if (mode !== "phone_bind") return;
      try {
        const res = await fetch("/api/site/registration", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as any;
        const enabled = json?.phoneFeatureEnabled !== false;
        if (!stopped) setPhoneFeatureEnabled(enabled);
        if (!stopped && !enabled) router.replace("/auth/login");
      } catch {
        if (!stopped) {
          setPhoneFeatureEnabled(false);
          router.replace("/auth/login");
        }
      }
    })();
    return () => {
      stopped = true;
    };
  }, [mode, router]);

  async function verifyDevice() {
    if (!challengeId || code.trim().length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login/device/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, code: code.trim(), deviceId }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        setError(String(json?.error || "verify_failed"));
        return;
      }
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  }

  async function resendDeviceCode() {
    if (!challengeId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login/device/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) setError(String(json?.error || "send_failed"));
    } finally {
      setLoading(false);
    }
  }

  if (mode !== "device" && mode !== "phone_bind") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-sm dark:border-white/10 dark:bg-white/5">
        <div className="font-semibold text-slate-900 dark:text-white">{tr("無效驗證頁面", "无效验证页面", "Invalid verification page")}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {mode === "device"
            ? tr("新裝置驗證", "新设备验证", "New device verification")
            : tr("綁定手機號", "绑定手机号", "Bind phone number")}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {mode === "device"
            ? tr("已送出 6 位驗證碼到你的信箱。", "已发送 6 位验证码到你的邮箱。", "A 6-digit code was sent to your email.")
            : tr("登入前需要先綁定並驗證手機號。", "登录前需要先绑定并验证手机号。", "You must bind and verify a phone number before sign-in.")}
        </p>
      </div>

      {mode === "device" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              inputMode="numeric"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
              placeholder={tr("6 位驗證碼", "6 位验证码", "6-digit code")}
            />
            <button
              type="button"
              onClick={() => void verifyDevice()}
              disabled={loading || code.trim().length !== 6}
              className="h-10 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {tr("驗證", "验证", "Verify")}
            </button>
          </div>
          <div className="mt-3 flex justify-between">
            <button
              type="button"
              onClick={() => void resendDeviceCode()}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {tr("重新發送", "重新发送", "Resend code")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {tr("返回登入", "返回登录", "Back to login")}
            </button>
          </div>
        </div>
      ) : phoneFeatureEnabled ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-200">{tr("手機號", "手机号", "Phone number")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
              placeholder="+8613800138000"
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 dark:border-white/10 dark:bg-sky-950/30">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("圖像驗證碼", "图像验证码", "Captcha")}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-14 w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                {captchaImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={captchaImg} alt="captcha" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-slate-600 dark:text-slate-300">{captchaLoading ? "..." : "-"}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void refreshCaptcha()}
                disabled={captchaLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {tr("刷新", "刷新", "Refresh")}
              </button>
              <input
                value={captchaCode}
                onChange={(e) => setCaptchaCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8))}
                className="h-10 w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                placeholder={tr("輸入驗證碼", "输入验证码", "Enter code")}
              />
            </div>
          </div>
          <SmsVerifyPanel
            purpose="login_bind_phone"
            phone={phone.trim()}
            bindToken={bindToken}
            captchaId={captchaId}
            captchaCode={captchaCode}
            onVerified={() => {
              window.location.href = "/dashboard";
            }}
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-100">{error}</div>
      ) : null}
    </div>
  );
}

export default function AuthChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AuthChallengeInner />
    </Suspense>
  );
}

