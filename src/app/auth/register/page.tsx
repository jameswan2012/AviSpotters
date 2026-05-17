"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useClientLocale } from "@/i18n/client-locale";
import { AuthFeaturedCarousel } from "@/components/auth/AuthFeaturedCarousel";

type RegistrationSetting = {
  enabled?: boolean;
  phoneFeatureEnabled?: boolean;
  phoneRegistrationEnabled?: boolean;
};

export default function AuthRegisterPage() {
  const router = useRouter();
  const locale = useClientLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [phone, setPhone] = useState("");
  const [setting, setSetting] = useState<RegistrationSetting>({});
  const [captchaId, setCaptchaId] = useState<string>("");
  const [captchaImg, setCaptchaImg] = useState<string>("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tr = useMemo(
    () => (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant),
    [locale]
  );

  async function refreshCaptcha() {
    try {
      const res = await fetch("/api/captcha/new", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as any;
      if (res.ok && json?.id && json?.image) {
        setCaptchaId(String(json.id));
        setCaptchaImg(String(json.image));
        setCaptchaCode("");
      }
    } catch {
    }
  }

  useEffect(() => {
    let stopped = false;
    (async () => {
      try {
        const res = await fetch("/api/site/registration", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as RegistrationSetting;
        if (!stopped) setSetting(json || {});
      } catch {
        if (!stopped) setSetting({});
      }
    })();
    void refreshCaptcha();
    return () => {
      stopped = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError(tr("請輸入帳號名稱。", "请输入账号名称。", "Please enter an account name."));
    if (!email.trim()) return setError(tr("請輸入 Email。", "请输入 Email。", "Please enter your email."));
    if (password.length < 6) return setError(tr("密碼至少 6 碼。", "密码至少 6 位。", "Password must be at least 6 characters."));
    if (password !== password2) return setError(tr("兩次密碼不一致。", "两次密码不一致。", "Passwords do not match."));
    if (setting.enabled === false) return setError(tr("目前已關閉註冊。", "目前已关闭注册。", "Registration is disabled."));
    if (setting.phoneFeatureEnabled !== false && setting.phoneRegistrationEnabled !== false && !phone.trim()) {
      return setError(tr("請輸入手機號。", "请输入手机号。", "Please enter a phone number."));
    }
    if (setting.phoneFeatureEnabled !== false && setting.phoneRegistrationEnabled !== false && (!captchaId || captchaCode.trim().length < 4)) {
      return setError(tr("請先完成圖像驗證碼。", "请先完成图形验证码。", "Please complete the captcha first."));
    }

    setLoading(true);
    try {
      window.sessionStorage.setItem(
        "avispotters_register_payload",
        JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: setting.phoneFeatureEnabled !== false && setting.phoneRegistrationEnabled !== false ? phone.trim() : "",
          captchaId,
          captchaCode: captchaCode.trim().toUpperCase(),
        })
      );
      router.push("/auth/register/verify");
    } catch {
      setError(tr("無法建立註冊流程，請重試。", "无法建立注册流程，请重试。", "Failed to start registration flow."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <AuthFeaturedCarousel variant="backdrop" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
        <div className="grid w-full items-start gap-6 lg:grid-cols-[460px_minmax(0,1fr)] lg:gap-10">
          <div className="rounded-3xl border border-white/25 bg-white/95 p-6 shadow-xl shadow-slate-900/10 backdrop-blur-sm dark:border-white/10 dark:bg-sky-950/90 dark:shadow-black/40">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {tr("建立帳號", "创建账号", "Create account")}
            </h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {tr("完成基本資料後，下一步會進行 Email / 手機驗證。", "完成基本资料后，下一步会进行 Email / 手机验证。", "After filling out the form, the next step verifies your email / phone.")}
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-slate-700 dark:text-slate-200">{tr("帳號名稱", "账号名称", "Account name")}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  placeholder={tr("2-30 字，可作為登入識別", "2-30 字，可作为登录识别", "2-30 chars, usable for sign in")}
                />
              </div>

              <div>
                <label className="text-sm text-slate-700 dark:text-slate-200">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700 dark:text-slate-200">{tr("密碼", "密码", "Password")}</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700 dark:text-slate-200">{tr("確認密碼", "确认密码", "Confirm password")}</label>
                  <input
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    type="password"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                  />
                </div>
              </div>

              {setting.phoneFeatureEnabled !== false && setting.phoneRegistrationEnabled !== false ? (
                <>
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">{tr("手機號", "手机号", "Phone number")}</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                      placeholder="+8613800138000"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 dark:border-white/10 dark:bg-sky-950/30">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("圖像驗證碼", "图形验证码", "Captcha")}</div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="h-14 w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                        {captchaImg ? <img src={captchaImg} alt="captcha" className="h-full w-full object-cover" /> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void refreshCaptcha()}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        {tr("刷新", "刷新", "Refresh")}
                      </button>
                      <input
                        value={captchaCode}
                        onChange={(e) => setCaptchaCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8))}
                        className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/60 dark:text-white"
                        placeholder={tr("輸入驗證碼", "输入验证码", "Enter captcha")}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-100">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || setting.enabled === false}
                className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
              >
                {loading ? tr("處理中…", "处理中…", "Processing...") : tr("下一步：驗證", "下一步：验证", "Next: verification")}
              </button>
            </form>

            <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">
              {tr("已有帳號？", "已有账号？", "Already have an account?")}{" "}
              <Link href="/login" className="font-semibold text-sky-700 hover:underline dark:text-sky-300">
                {tr("返回登入", "返回登录", "Back to sign in")}
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-3xl border border-white/20 bg-black/20 p-6 text-white backdrop-blur">
              <div className="text-3xl font-black tracking-tight">{tr("開始建立你的航空主頁", "开始建立你的航空主页", "Start your aviation profile")}</div>
              <div className="mt-3 max-w-xl text-sm leading-6 text-white/85">
                {tr(
                  "註冊後即可建立個人主頁、上傳作品、管理影片內容並參與站內互動。",
                  "注册后即可建立个人主页、上传作品、管理视频内容并参与站内互动。",
                  "After signing up, you can build your profile, upload content, manage videos, and join the community."
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
