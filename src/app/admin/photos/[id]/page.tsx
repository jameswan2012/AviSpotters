import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/admin-guard";
import { getServerLocaleOnly } from "@/i18n/server";
import { PhotoInspector } from "@/components/photos/PhotoInspector";
import { PhotoReviewPanel } from "@/components/admin/PhotoReviewPanel";
import { ReReviewAction } from "@/components/admin/ReReviewAction";
import { isRejectedPreviewOnly } from "@/lib/rejected-retention";

function text(locale: string, zhHant: string, zhHans: string, en: string) {
  return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
}

function parseCategories(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "").trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export default async function AdminPhotoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, { user, roleId }, locale] = await Promise.all([params, requireStaff(), getServerLocaleOnly()]);

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      assignedReviewerId: true,
      priority: true,
      reReviewRequestedAt: true,
      reReviewReason: true,
      registration: true,
      shotAirport: true,
      aircraftModel: true,
      airline: true,
      shotAt: true,
      ccAgree: true,
      categoriesJson: true,
      title: true,
      msn: true,
      serialNumber: true,
      description: true,
      uploaderMessage: true,
      replyLocale: true,
      staffNote: true,
      firstReviewedAt: true,
      firstReviewDecision: true,
      firstReviewReason: true,
      firstReviewedBy: { select: { name: true, email: true } },
      reviewedById: true,
      reviewedAt: true,
      reviewDecision: true,
      reviewReason: true,
      reviewedBy: { select: { name: true, email: true } },
      featured: true,
      hot: true,
      width: true,
      height: true,
      fileName: true,
      fileSizeBytes: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!photo) notFound();

  const [sameRegistrationApproved, authorApproved] = await Promise.all([
    prisma.photo.findMany({
      where: {
        status: "approved",
        registration: photo.registration,
        NOT: { id: photo.id },
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        registration: true,
        shotAt: true,
        airline: true,
        aircraftModel: true,
      },
    }),
    prisma.photo.findMany({
      where: {
        status: "approved",
        userId: photo.userId,
        NOT: { id: photo.id },
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        registration: true,
        shotAt: true,
        airline: true,
        aircraftModel: true,
      },
    }),
  ]);

  const categories = parseCategories(photo.categoriesJson);
  const previewVariant =
    photo.status === "pending"
      ? "original"
      : isRejectedPreviewOnly({ status: photo.status, reviewedAt: photo.reviewedAt, updatedAt: photo.updatedAt })
        ? "thumb"
        : "display";
  const imageUrl = `/api/photos/${encodeURIComponent(photo.id)}/image?variant=${previewVariant}`;
  const author = photo.user.name ?? photo.user.email;
  const firstReview = photo.firstReviewDecision
    ? {
        decision: photo.firstReviewDecision,
        reason: photo.firstReviewReason,
        reviewerName: photo.firstReviewedBy?.name ?? photo.firstReviewedBy?.email ?? null,
        reviewedAtIso: photo.firstReviewedAt ? photo.firstReviewedAt.toISOString().slice(0, 19).replace("T", " ") : null,
      }
    : null;
  const reviewer = photo.reviewedBy?.name ?? photo.reviewedBy?.email ?? null;
  const canUseRobotReview = photo.status === "pending" && photo.userId !== user.id;
  const robotReviewBlockedReason = photo.userId === user.id ? "上傳者本人不可對自己的待審作品執行機器人分析。" : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{photo.title || photo.registration}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {photo.registration} · {photo.airline} · {photo.aircraftModel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/photos"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {text(locale, "返回待審", "返回待审", "Back to pending")}
          </Link>
          <Link
            href="/admin/photos/history"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {text(locale, "歷史審圖", "历史审图", "History")}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <PhotoInspector
            imageUrl={imageUrl}
            photoId={photo.id}
            showSmartAssessment
            aiTrainingEnabled={false}
            canUseRobotReview={canUseRobotReview}
            robotReviewBlockedReason={robotReviewBlockedReason}
          />

          <PreviewGrid
            title={text(locale, "同註冊號已通過（快速查重）", "同注册号已通过（快速查重）", "Approved with same registration")}
            emptyText={text(locale, "暫無同註冊號已通過作品。", "暂无同注册号已通过作品。", "No approved photos with the same registration yet.")}
            items={sameRegistrationApproved}
          />

          <PreviewGrid
            title={text(locale, "該作者已通過（最新 3 張）", "该作者已通过（最新 3 张）", "Approved by same author (latest 3)")}
            emptyText={text(locale, "該作者暫無其他已通過作品。", "该作者暂无其他已通过作品。", "This uploader has no other approved photos.")}
            items={authorApproved}
          />
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{text(locale, "作品資訊", "作品信息", "Photo info")}</h2>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Info label={text(locale, "上傳者", "上传者", "Uploader")} value={author} />
              <Info label={text(locale, "狀態", "状态", "Status")} value={photo.status} />
              <Info label={text(locale, "機場", "机场", "Airport")} value={photo.shotAirport} />
              <Info label={text(locale, "拍攝日期", "拍摄日期", "Shot date")} value={photo.shotAt} />
              <Info label="MSN" value={photo.msn || "—"} />
              <Info label={text(locale, "序列號", "序列号", "Serial")} value={photo.serialNumber || "—"} />
              <Info label={text(locale, "回覆語言", "回复语言", "Reply locale")} value={photo.replyLocale} />
              <Info
                label={text(locale, "尺寸", "尺寸", "Dimensions")}
                value={photo.width && photo.height ? `${photo.width} × ${photo.height}` : "—"}
              />
              <Info
                label={text(locale, "檔名", "文件名", "Filename")}
                value={photo.fileName || "—"}
                wide
              />
              <Info
                label={text(locale, "檔案大小", "文件大小", "File size")}
                value={photo.fileSizeBytes ? `${(photo.fileSizeBytes / 1024 / 1024).toFixed(2)} MB` : "—"}
              />
            </dl>

            {categories.length ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{text(locale, "分類", "分类", "Categories")}</div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <span key={category} className="rounded-xl border border-slate-300/30 bg-slate-500/10 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {photo.description ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{text(locale, "描述", "描述", "Description")}</div>
                <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                  {photo.description}
                </div>
              </div>
            ) : null}

            {photo.uploaderMessage ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{text(locale, "上傳者留言（僅審核員可見）", "上传者留言（仅审核员可见）", "Uploader message (staff only)")}</div>
                <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                  {photo.uploaderMessage}
                </div>
              </div>
            ) : null}

            {photo.reReviewRequestedAt ? (
              <div className="mt-4 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-900 dark:text-fuchsia-100">
                <div className="font-semibold">{text(locale, "此作品處於回溯二審狀態", "此作品处于回溯二审状态", "This photo is in re-review")}</div>
                {photo.reReviewReason ? <div className="mt-2 whitespace-pre-wrap">{photo.reReviewReason}</div> : null}
              </div>
            ) : null}
          </section>

          {photo.status === "pending" ? (
            <PhotoReviewPanel
              photoId={photo.id}
              photoLabel={photo.title || photo.registration}
              initialAssignedToMe={photo.assignedReviewerId === user.id}
              initialFeatured={photo.featured}
              initialHot={photo.hot}
              initialStaffNote={photo.staffNote}
              canFeature={roleId >= 4}
              canHot={roleId >= 4}
              firstReview={firstReview}
            />
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{text(locale, "最終審核結果", "最终审核结果", "Final decision")}</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <div>
                  {text(locale, "結果", "结果", "Decision")}：
                  <span className="ml-2 font-semibold">{photo.reviewDecision || photo.status}</span>
                </div>
                <div>
                  {text(locale, "審核員", "审核员", "Reviewer")}：
                  <span className="ml-2 font-semibold">{reviewer || "—"}</span>
                </div>
                <div>
                  {text(locale, "時間", "时间", "At")}：
                  <span className="ml-2 font-semibold">
                    {photo.reviewedAt ? photo.reviewedAt.toISOString().slice(0, 19).replace("T", " ") : "—"}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap dark:border-white/10 dark:bg-black/20">
                  {photo.reviewReason || "—"}
                </div>
              </div>
              {roleId >= 4 ? (
                <div className="mt-4">
                  <ReReviewAction photoId={photo.id} />
                </div>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function PreviewGrid({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{
    id: string;
    title: string | null;
    registration: string;
    shotAt: string;
    airline: string;
    aircraftModel: string;
  }>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      {items.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={`/gallery/${encodeURIComponent(item.id)}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:bg-slate-100 dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${encodeURIComponent(item.id)}/image?variant=thumb`} alt={item.title ?? item.registration} className="h-40 w-full object-cover" />
              <div className="space-y-1 p-3">
                <div className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{item.title || item.registration}</div>
                <div className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                  {item.registration} · {item.airline} · {item.aircraftModel}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{item.shotAt}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">{emptyText}</div>
      )}
    </section>
  );
}
