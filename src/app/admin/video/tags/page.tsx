import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";
import Link from "next/link";

export default async function AdminVideoTagsPage() {
  const { user, roleId } = await requireStaff();

  const tags = await prisma.videoTag.findMany({
    orderBy: [{ usageCount: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">视频标签管理</h1>
        <div className="flex gap-2">
          <Link href="/admin/video/review" className="rounded-lg bg-blue-500 px-4 py-2 text-white">
            视频审核
          </Link>
          <Link href="/admin/video/certification" className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-700">
            认证审核
          </Link>
        </div>
      </div>

      <form action="/api/admin/video/tags" method="POST" className="flex gap-2">
        <input type="text" name="name" placeholder="新标签名称" required className="flex-1 rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800" />
        <button type="submit" className="rounded-lg bg-blue-500 px-4 py-2 text-white">
          添加标签
        </button>
      </form>

      <div className="rounded-lg bg-white dark:bg-slate-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2 text-left">名称</th>
              <th className="px-4 py-2 text-left">使用次数</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-2">{tag.name}</td>
                <td className="px-4 py-2">{tag.usageCount}</td>
                <td className="px-4 py-2">
                  <span className={tag.isActive ? "text-green-500" : "text-red-500"}>{tag.isActive ? "启用" : "禁用"}</span>
                </td>
                <td className="px-4 py-2">
                  <form action={`/api/admin/video/tags/${tag.id}`} method="POST" className="flex gap-2">
                    <input type="hidden" name="_action" value="toggle" />
                    <button type="submit" className="text-blue-500 hover:underline">
                      {tag.isActive ? "禁用" : "启用"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
