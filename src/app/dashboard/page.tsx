import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocaleOnly();
  const [approvedCount, pendingCount, rejectedCount, appealCount, reportCount, videoAccount] = await Promise.all([
    prisma.photo.count({ where: { userId: user.id, status: "approved" } }),
    prisma.photo.count({ where: { userId: user.id, status: "pending" } }),
    prisma.photo.count({ where: { userId: user.id, status: "rejected" } }),
    prisma.appeal.count({ where: { userId: user.id } }),
    prisma.correctionReport.count({ where: { userId: user.id } }),
    prisma.videoAccount.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);

  function text(zhHant: string, zhHans: string, en: string) {
    return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{text("儀表板", "仪表板", "Dashboard")}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {text("這裡集中你的作品狀態、申訴／舉報與常用入口。", "这里集中你的作品状态、申诉／举报与常用入口。", "Your photo status, appeals, reports, and common actions are gathered here.")}
            </p>
          </div>
          <Link href="/users/me" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
            {text("我的主頁", "我的主页", "My profile")}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title={text("已通過", "已通过", "Approved")} value={approvedCount} />
        <StatCard title={text("待審", "待审", "Pending")} value={pendingCount} />
        <StatCard title={text("已拒絕", "已拒绝", "Rejected")} value={rejectedCount} />
        <StatCard title={text("我的申訴", "我的申诉", "My appeals")} value={appealCount} />
        <StatCard title={text("我的舉報", "我的举报", "My reports")} value={reportCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title={text("作品與帳號", "作品与账号", "Photos and account")}
          items={[
            { href: "/photos/upload", label: text("上傳照片", "上传照片", "Upload photo") },
            { href: "/photos/mine", label: text("我的作品", "我的作品", "My photos") },
            { href: "/users/me", label: text("我的主頁", "我的主页", "My profile") },
            { href: "/account/profile", label: text("帳號設定", "账号设置", "Account settings") },
          ]}
        />
        <Section
          title={text("申訴與支援", "申诉与支持", "Appeals and support")}
          items={[
            { href: "/appeals", label: text("我的申訴", "我的申诉", "My appeals") },
            { href: "/reports", label: text("我的舉報", "我的举报", "My reports") },
            { href: "/support", label: text("站內客服", "站内客服", "Support") },
            { href: "/dashboard/apply", label: text("入職申請", "入职申请", "Staff application") },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title={text("內容入口", "内容入口", "Explore")}
          items={[
            { href: "/photos", label: text("圖庫", "图库", "Gallery") },
            { href: "/video", label: text("影片", "视频", "Videos") },
            { href: "/leaderboard", label: text("排行榜", "排行榜", "Leaderboard") },
            { href: "/topics", label: text("題材", "题材", "Topics") },
          ]}
        />
        <Section
          title={text("更多功能", "更多功能", "More")}
          items={[
            { href: "/points", label: text("積分帳本", "积分账本", "Points ledger") },
            { href: "/shop", label: text("積分商店", "积分商店", "Reward shop") },
            { href: "/lottery", label: text("抽獎中心", "抽奖中心", "Lottery") },
            { href: videoAccount ? "/video/account/manage" : "/video/account/create", label: videoAccount ? text("管理影片帳號", "管理视频账号", "Manage video account") : text("建立影片帳號", "建立视频账号", "Create video account") },
            { href: "/aircraft", label: text("飛機資料庫", "飞机数据库", "Aircraft database") },
            { href: "/models", label: text("機型資料庫", "机型资料库", "Model library") },
            ...(user.roleId >= 2 ? [{ href: "/admin", label: text("管理後台", "管理后台", "Admin panel") }] : []),
          ]}
        />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm text-slate-600 dark:text-slate-300">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value.toLocaleString()}</div>
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-black/30"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
