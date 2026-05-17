import type { Locale } from "@/i18n/shared";

const messages: Record<string, { "zh-Hant": string; "zh-Hans": string; en: string }> = {
  "app.name": { "zh-Hant": "AviSpotters", "zh-Hans": "AviSpotters", en: "AviSpotters" },
  "nav.home": { "zh-Hant": "首頁", "zh-Hans": "首页", en: "Home" },
  "nav.leaderboard": { "zh-Hant": "排行榜", "zh-Hans": "排行榜", en: "Leaderboard" },
  "nav.models": { "zh-Hant": "機型庫", "zh-Hans": "机型库", en: "Models" },
  "nav.dashboard": { "zh-Hant": "儀表板", "zh-Hans": "仪表板", en: "Dashboard" },
  "nav.points": { "zh-Hant": "積分", "zh-Hans": "积分", en: "Points" },
  "nav.login": { "zh-Hant": "登入", "zh-Hans": "登录", en: "Sign in" },
  "nav.register": { "zh-Hant": "註冊", "zh-Hans": "注册", en: "Register" },
  "nav.logout": { "zh-Hant": "登出", "zh-Hans": "登出", en: "Sign out" },
  "chat.title": { "zh-Hant": "聊天", "zh-Hans": "聊天", en: "Chat" },
  "chat.subtitle": { "zh-Hant": "全站工作群與私聊入口。", "zh-Hans": "全站工作群与私聊入口。", en: "Team rooms and direct messages." },
  "home.cta.dashboard": { "zh-Hant": "前往儀表板", "zh-Hans": "前往仪表板", en: "Open dashboard" },
  "home.cta.register": { "zh-Hant": "立即註冊", "zh-Hans": "立即注册", en: "Create account" },
  "home.cta.login": { "zh-Hant": "登入帳號", "zh-Hans": "登录账号", en: "Sign in" },
  "photos.featured": { "zh-Hant": "精選照片", "zh-Hans": "精选照片", en: "Featured photos" },
  "auth.login.email": { "zh-Hant": "帳號或 Email", "zh-Hans": "账号或 Email", en: "Account or email" },
  "auth.login.emailPlaceholder": { "zh-Hant": "請輸入帳號或 Email", "zh-Hans": "请输入账号或 Email", en: "Enter account or email" },
  "auth.login.password": { "zh-Hant": "密碼", "zh-Hans": "密码", en: "Password" },
  "auth.login.passwordPlaceholder": { "zh-Hant": "請輸入密碼", "zh-Hans": "请输入密码", en: "Enter password" },
  "auth.password.show": { "zh-Hant": "顯示", "zh-Hans": "显示", en: "Show" },
  "auth.password.hide": { "zh-Hant": "隱藏", "zh-Hans": "隐藏", en: "Hide" },
  "auth.login.submit": { "zh-Hant": "登入", "zh-Hans": "登录", en: "Sign in" },
  "auth.login.submitting": { "zh-Hant": "登入中...", "zh-Hans": "登录中...", en: "Signing in..." }
};

export function t(locale: Locale, key: string, vars?: Record<string, string | number>) {
  const value = messages[key];
  let text = value ? value[locale] ?? value["zh-Hant"] : key;
  if (vars) {
    for (const [name, raw] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(raw));
    }
  }
  return text;
}
