import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default async function VideoAccountsPage({ searchParams }: { searchParams: Promise<{ action?: string; userId?: string }> }) {
  const { roleId } = await requireStaff();
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  
  // Only role 4+ (senior admin) can create accounts directly
  if (roleId < 4) redirect("/admin");

  const action = sp.action;
  const targetUserId = sp.userId;

  // Get all video accounts
  const accounts = await prisma.videoAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
      _count: { select: { videos: true, followers: true } },
    },
  });

  // Get users without video accounts for creation
  const usersWithoutAccount = await prisma.user.findMany({
    where: {
      deletedAt: null,
      videoAccount: null,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, email: true, name: true },
  });

  // Handle create account action
  if (action === "create" && targetUserId) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (user) {
      await prisma.videoAccount.create({
        data: {
          userId: user.id,
          nickname: user.name || user.email.split("@")[0],
          isPublic: true,
        },
      });
      redirect("/admin/video/accounts");
    }
  }

  // Handle delete account action
  if (action === "delete" && targetUserId) {
    const account = await prisma.videoAccount.findUnique({ where: { userId: targetUserId } });
    if (account) {
      await prisma.videoAccount.delete({ where: { userId: targetUserId } });
      redirect("/admin/video/accounts");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            视频账号管理
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            高级管理员可以直接开通或删除账号
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/video/review" className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-700">
            视频审核
          </Link>
          <Link href="/admin/video/certification" className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-700">
            认证审核
          </Link>
        </div>
      </div>

      {/* Create Account Section */}
      {usersWithoutAccount.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            开通新账号
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {usersWithoutAccount.slice(0, 8).map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 dark:border-white/10">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {user.name || user.email.split("@")[0]}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <Link
                  href={`/admin/video/accounts?action=create&userId=${user.id}`}
                  className="ml-2 shrink-0 rounded-lg bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-400"
                >
                  开通
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            已有账号 ({accounts.length})
          </h2>
        </div>
        
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            暂无视频账号
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center gap-4 p-4">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                  {account.avatarPath ? (
                    <Image src={`/uploads/${account.avatarPath}`} alt={account.nickname} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-purple-600 text-lg font-bold text-white">
                      {account.nickname.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {account.nickname}
                    {account.certificationStatus === "white" && (
                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white">
                        <svg className="h-2.5 w-2.5 fill-black" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      </span>
                    )}
                    {account.certificationStatus === "yellow" && (
                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500">
                        <svg className="h-2.5 w-2.5 fill-white" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">
                    {account.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                  <div className="text-center">
                    <div className="font-semibold">{account._count.videos}</div>
                    <div className="text-xs">视频</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{account._count.followers}</div>
                    <div className="text-xs">粉丝</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/video/account/${account.userId}`}
                    target="_blank"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    查看
                  </Link>
                  <Link
                    href={`/admin/video/accounts?action=delete&userId=${account.userId}`}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    title="删除后不可恢复"
                  >
                    删除
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
