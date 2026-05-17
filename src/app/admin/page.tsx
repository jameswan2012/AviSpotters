import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { redirect } from "next/navigation";

export default async function AdminHomePage() {
  const { roleId } = await requireStaff();
  const locale = await getServerLocaleOnly();

  const [userCount, openConversations, airportCount, overridesCount, videoAccounts, pendingVideoCerts, pendingVideos] = await Promise.all([
    prisma.user.count(),
    prisma.conversation.count({ where: { status: "open" } }),
    prisma.airport.count(),
    prisma.modelOverride.count(),
    prisma.videoAccount.count(),
    prisma.videoCertification.count({ where: { status: "pending" } }),
    prisma.video.count({ where: { status: "pending" } }),
  ]);

  // Role 4+ can see video management
  const showVideo = roleId >= 4;

  if (roleId < 3) redirect("/admin/photos");

  return (
    <div className="space-y-6">
      {showVideo && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-red-500/10 to-rose-500/10 p-4 dark:border-white/10">
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
            🎬 {locale === "en" ? "Video Platform" : locale === "zh-Hans" ? "短视频平台" : "短影片平台"}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Link href="/admin/video/accounts" className="rounded-xl bg-white p-4 dark:bg-white/5">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{videoAccounts}</div>
              <div className="text-xs text-slate-500">{locale === "en" ? "Accounts" : locale === "zh-Hans" ? "账号数" : "帳號數"}</div>
            </Link>
            <Link href="/admin/video/certification" className="rounded-xl bg-white p-4 dark:bg-white/5">
              <div className="text-2xl font-bold text-red-500">{pendingVideoCerts}</div>
              <div className="text-xs text-slate-500">{locale === "en" ? "Cert Pending" : locale === "zh-Hans" ? "认证待审" : "認證待審"}</div>
            </Link>
            <Link href="/admin/video/review" className="rounded-xl bg-white p-4 dark:bg-white/5">
              <div className="text-2xl font-bold text-orange-500">{pendingVideos}</div>
              <div className="text-xs text-slate-500">{locale === "en" ? "Videos Pending" : locale === "zh-Hans" ? "视频待审" : "影片待審"}</div>
            </Link>
            <Link href="/admin/video/accounts?action=create" className="rounded-xl bg-white p-4 dark:bg-white/5">
              <div className="text-sm font-medium text-slate-900 dark:text-white">+ {locale === "en" ? "Create Account" : locale === "zh-Hans" ? "开通账号" : "開通帳號"}</div>
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          title={locale === "en" ? "Users" : locale === "zh-Hans" ? "注册用户" : "註冊使用者"}
          value={userCount}
          href="/admin/users"
          locale={locale}
        />
        <Card
          title={locale === "en" ? "Open conversations" : locale === "zh-Hans" ? "未结案对话" : "未結案對話"}
          value={openConversations}
          href="/admin/inbox"
          locale={locale}
        />
        <Card
          title={locale === "en" ? "Airports" : locale === "zh-Hans" ? "机场资料" : "機場資料"}
          value={airportCount}
          href="/admin/airports"
          locale={locale}
        />
        <Card
          title={locale === "en" ? "Model overrides" : locale === "zh-Hans" ? "机型覆写" : "機型覆寫"}
          value={overridesCount}
          href="/admin/models"
          locale={locale}
        />
      </div>
    </div>
  );
}

function Card({ title, value, href, locale }: { title: string; value: number; href: string; locale: "zh-Hant" | "zh-Hans" | "en" }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-6 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="text-sm text-slate-700 dark:text-slate-200">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value.toLocaleString()}</div>
      <div className="mt-4 text-xs font-semibold text-sky-700 dark:text-sky-300">
        {locale === "en" ? "Open →" : locale === "zh-Hans" ? "前往 →" : "前往 →"}
      </div>
    </Link>
  );
}
