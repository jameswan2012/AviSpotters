"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useClientLocale } from "@/i18n/client-locale";

interface Video {
  id: string;
  type: "video" | "image";
  description: string;
  location: string;
  thumbnailPath?: string;
  videoPath?: string;
  imagePathsJson?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  favoriteCount?: number;
  account: {
    id: string;
    nickname: string;
    avatarPath?: string;
    avatarMime?: string;
    certificationStatus: string;
    certificationScore: number;
  };
  createdAt?: string;
  canModify?: boolean;
  isOwner?: boolean;
  relatedPhoto?: {
    id: string;
    title: string | null;
    registration: string;
    airline: string;
    aircraftModel: string;
    shotAirport: string;
    shotAt: string;
  } | null;
  isLiked?: boolean;
  isFollowing?: boolean;
}

export default function VideoPage({ video: initialVideo }: { video: Video }) {
  const locale = useClientLocale();
  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  const [video, setVideo] = useState<Video>(initialVideo);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [privateTargets, setPrivateTargets] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [shareMode, setShareMode] = useState<"private" | "group">("private");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetRoomId, setTargetRoomId] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(initialVideo.description || "");
  const [editRelatedPhotoId, setEditRelatedPhotoId] = useState<string>(
    initialVideo.relatedPhoto?.id || ""
  );
  const [editThumbnail, setEditThumbnail] = useState<File | null>(null);
  const [approvedPhotos, setApprovedPhotos] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingRecommend, setSubmittingRecommend] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const normalizeVideoAssetPath = (raw?: string | null) => {
    const s = String(raw || "").trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    const p = s.replaceAll("\\", "/");
    const m =
      p.match(/\/public\/uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/\/uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/^uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/^\/?videos\/(.+)$/i) ||
      p.match(/^\/?uploads\/(.+)$/i);
    if (m?.[1]) return m[1];
    return p.split("/").filter(Boolean).pop() || null;
  };

  const encodeUrlPath = (input: string) =>
    input
      .split("/")
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join("/");

  const toVideoAssetUrl = (raw?: string | null) => {
    const normalized = normalizeVideoAssetPath(raw);
    if (!normalized) return null;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `/api/video/stream/${encodeUrlPath(normalized)}`;
  };

  useEffect(() => {
    if (searchParams.get("comment") === "true") {
      setShowCommentInput(true);
      loadComments();
    }
    if (searchParams.get("share") === "true") {
      void openSharePicker();
    }
  }, [searchParams]);

  const handleLike = async () => {
    if (submittingRecommend) return;
    if (video.isLiked) return;
    try {
      setSubmittingRecommend(true);
      const res = await fetch(`/api/video/videos/${video.id}/like`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success !== false) {
        setVideo((prev) => ({
          ...prev,
          isLiked: !!data.liked,
          likeCount: typeof data.likeCount === "number" ? data.likeCount : prev.likeCount,
        }));
      }
    } catch (error) {
      console.error("Failed to like:", error);
    } finally {
      setSubmittingRecommend(false);
    }
  };

  const handleFavorite = async () => {
    try {
      await fetch(`/api/video/videos/${video.id}/favorite`, {
        method: "POST",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to favorite:", error);
    }
  };

  const openSharePicker = async () => {
    setShowSharePicker(true);
    try {
      const res = await fetch("/api/video/share-targets");
      const data = await res.json();
      if (Array.isArray(data.privateTargets)) {
        setPrivateTargets(data.privateTargets);
        if (!targetUserId && data.privateTargets.length > 0) setTargetUserId(data.privateTargets[0].id);
      }
      if (Array.isArray(data.groups)) {
        setGroups(data.groups);
        if (!targetRoomId && data.groups.length > 0) setTargetRoomId(data.groups[0].id);
      }
    } catch {
    }
  };

  const submitShare = async () => {
    if (shareMode === "private") {
      if (!targetUserId) {
        alert(tr("請選擇私聊對象", "请选择私聊对象", "Please select a direct chat target"));
        return;
      }
      await fetch(`/api/video/videos/${video.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareType: "private", targetUserId }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok || data.success === false) throw new Error(data.error || tr("分享失敗", "分享失败", "Share failed"));
        setVideo((prev) => ({ ...prev, shareCount: prev.shareCount + 1 }));
        setShowSharePicker(false);
      }).catch((e) => alert(e instanceof Error ? e.message : tr("分享失敗", "分享失败", "Share failed")));
      return;
    }
    if (!targetRoomId) {
      alert(tr("請選擇群組", "请选择群组", "Please select a group"));
      return;
    }
    await fetch(`/api/video/videos/${video.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareType: "group", targetRoomId }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok || data.success === false) throw new Error(data.error || tr("分享失敗", "分享失败", "Share failed"));
      setVideo((prev) => ({ ...prev, shareCount: prev.shareCount + 1 }));
      setShowSharePicker(false);
    }).catch((e) => alert(e instanceof Error ? e.message : tr("分享失敗", "分享失败", "Share failed")));
  };

  const handleFollow = async () => {
    try {
      const res = await fetch("/api/video/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAccountId: video.account.id }),
      });
      const data = await res.json();
      if (data.success !== false) {
        setVideo((prev) => ({
          ...prev,
          isFollowing: data.following,
        }));
      }
    } catch (error) {
      console.error("Failed to follow:", error);
    }
  };

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const params = new URLSearchParams();
      params.set("videoId", video.id);
      if (commentsCursor) params.set("cursor", commentsCursor);

      const res = await fetch(`/api/video/comments?${params}`);
      const data = await res.json();

      if (data.comments) {
        setComments((prev) => [...prev, ...data.comments]);
        setCommentsCursor(data.nextCursor || null);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    if (submittingComment) return;
    setCommentError(null);

    try {
      setSubmittingComment(true);
      const res = await fetch("/api/video/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, content: commentText }),
      });
      const data = await res.json();

      if (data.success) {
        setCommentText("");
        setShowCommentInput(false);
        setComments((prev) => [data.comment, ...prev]);
        setVideo((prev) => ({
          ...prev,
          commentCount: prev.commentCount + 1,
        }));
      } else {
        if (data?.error === "comment_too_fast") {
          setCommentError(tr("評論太快了，請稍後再發。", "评论太快了，请稍后再发。", "You are commenting too fast. Please try again later."));
        } else if (data?.error === "comment_rate_limited") {
          setCommentError(tr("評論過於頻繁，請稍後再試。", "评论过于频繁，请稍后再试。", "Too many comments. Please try again later."));
        } else if (data?.error === "duplicate_comment") {
          setCommentError(tr("請勿重複刷相同評論。", "请勿重复刷相同评论。", "Please avoid posting duplicate comments."));
        } else {
          setCommentError(typeof data?.error === "string" ? data.error : tr("評論發送失敗。", "评论发送失败。", "Failed to post comment."));
        }
      }
    } catch (error) {
      console.error("Failed to comment:", error);
      setCommentError(tr("評論發送失敗，請稍後再試。", "评论发送失败，请稍后再试。", "Failed to post comment, please try again."));
    } finally {
      setSubmittingComment(false);
    }
  };

  const getMediaUrl = () => {
    if (video.type === "video") {
      return toVideoAssetUrl(video.videoPath);
    } else {
      try {
        const images = JSON.parse(video.imagePathsJson || "[]");
        return images.length > 0 ? toVideoAssetUrl(images[0]) : null;
      } catch {
        return null;
      }
    }
  };

  const getAvatarUrl = (account: Video["account"]) => {
    if (account.avatarPath) {
      return `/uploads/${account.avatarPath}`;
    }
    return null;
  };

  const loadApprovedPhotos = async () => {
    try {
      const res = await fetch("/api/video/approved-photos");
      const data = await res.json();
      if (Array.isArray(data.photos)) setApprovedPhotos(data.photos);
    } catch {
    }
  };

  const submitEdit = async () => {
    const fd = new FormData();
    fd.set("description", editDescription);
    fd.set("relatedPhotoId", editRelatedPhotoId);
    if (editThumbnail) fd.set("thumbnail", editThumbnail);
    try {
      const res = await fetch(`/api/video/videos/${video.id}`, { method: "PUT", body: fd });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "更新失败");
      alert(tr("已更新", "已更新", "Updated"));
      setEditing(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : tr("更新失敗", "更新失败", "Update failed"));
    }
  };

  const removeVideo = async () => {
    if (!confirm(tr("確定刪除這個作品嗎？", "确定删除这个作品吗？", "Are you sure you want to delete this post?"))) return;
    try {
      const res = await fetch(`/api/video/videos/${video.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "删除失败");
      router.push("/video");
    } catch (e) {
      alert(e instanceof Error ? e.message : tr("刪除失敗", "删除失败", "Delete failed"));
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-[-12rem] mx-auto h-[28rem] w-[86rem] bg-[radial-gradient(circle_at_20%_25%,rgba(14,165,233,0.24),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(244,63,94,0.2),transparent_36%),radial-gradient(circle_at_50%_78%,rgba(99,102,241,0.18),transparent_40%)]" />
      <div className="relative flex min-h-screen flex-col gap-4 p-3 lg:flex-row lg:p-4">
        <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-[0_20px_55px_rgba(2,6,23,0.45)] backdrop-blur">
          {video.type === "video" ? (
            <video
              src={getMediaUrl() || undefined}
              poster={toVideoAssetUrl(video.thumbnailPath) || undefined}
              controls
              preload="auto"
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="grid grid-cols-3 gap-1 p-3">
              {(() => {
                try {
                  const images = JSON.parse(video.imagePathsJson || "[]");
                  return images.map((img: string, idx: number) => {
                    const src = toVideoAssetUrl(img);
                    if (!src) return null;
                    return (
                      <div key={idx} className="relative aspect-square">
                        <Image
                          src={src}
                          alt={`${video.description} ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    );
                  });
                } catch {
                  return null;
                }
              })()}
            </div>
          )}
          {video.relatedPhoto ? (
            <Link href={`/photos/${video.relatedPhoto.id}`} className="pointer-events-auto absolute right-3 top-3 z-20 block w-60 rounded-2xl border border-white/20 bg-black/55 p-2.5 text-white shadow-lg backdrop-blur hover:bg-black/70">
              <div className="mb-1 text-xs font-semibold text-white/90">{tr("關聯作品預覽", "关联作品预览", "Related photo")}</div>
              <div className="flex gap-2">
                <img
                  src={`/api/photos/${encodeURIComponent(video.relatedPhoto.id)}/image?variant=thumb`}
                  alt=""
                  className="h-14 w-20 rounded object-cover"
                />
                <div className="min-w-0 text-[11px] leading-4 text-white/90">
                  <div className="truncate font-semibold">{video.relatedPhoto.title || video.relatedPhoto.registration}</div>
                  <div className="truncate">{video.relatedPhoto.aircraftModel}</div>
                  <div className="truncate">{video.relatedPhoto.airline}</div>
                </div>
              </div>
            </Link>
          ) : null}
        </div>

        <div className="flex w-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/95 via-white/90 to-sky-50/70 shadow-[0_16px_45px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-gradient-to-b dark:from-slate-900/90 dark:via-slate-900/85 dark:to-sky-950/25 lg:w-96 lg:max-h-[calc(100vh-2rem)]">
          <div className="flex items-center gap-3 border-b border-slate-200/80 bg-white/60 p-4 backdrop-blur dark:border-slate-700/70 dark:bg-white/5">
            <Link href={`/video/account/${video.account.id}`}>
              <div className="relative h-12 w-12 overflow-hidden rounded-full">
                {getAvatarUrl(video.account) ? (
                  <Image
                    src={getAvatarUrl(video.account)!}
                    alt={video.account.nickname}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-500 text-white">
                    {video.account.nickname.charAt(0)}
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1">
              <Link href={`/video/account/${video.account.id}`} className="flex items-center gap-1">
                <span className="font-semibold">{video.account.nickname}</span>
              </Link>
              {!video.isFollowing && (
                <button
                  onClick={handleFollow}
                  className="mt-1 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-0.5 text-xs font-semibold text-white shadow-sm"
                >
                  + {tr("關注", "关注", "Follow")}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="whitespace-pre-wrap">{video.description}</p>
            {video.location && (
              <p className="mt-2 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                {video.location}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{video.viewCount} {tr("次觀看", "次观看", "views")}</p>
            {video.createdAt ? (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{tr("上傳時間：", "上传时间：", "Uploaded: ")}{new Date(video.createdAt).toLocaleString()}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={handleLike} disabled={submittingRecommend || !!video.isLiked} className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-sm font-semibold shadow-sm disabled:opacity-60 dark:border-white/10 dark:bg-white/5">
                <span className="text-sm">{tr("推薦", "推荐", "Like")} {video.likeCount}</span>
              </button>
              <button onClick={() => { setShowCommentInput(true); if (comments.length === 0) loadComments(); }} className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-white/5">
                <span className="text-sm">{video.commentCount}</span>
              </button>
              <button onClick={handleFavorite} className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-white/5">
                <span className="text-sm">{video.favoriteCount || 0}</span>
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={openSharePicker}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:from-sky-400 hover:to-indigo-400"
              >
                {tr("分享給指定對象", "分享给指定对象", "Share to...")}
              </button>
            </div>

            {video.isOwner ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {video.canModify ? (
                  <button
                    onClick={async () => {
                      await loadApprovedPhotos();
                      setEditing(true);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
                  >
                    {tr("編輯標題 / 封面 / 關聯作品（僅一次）", "编辑标题 / 封面 / 关联作品 仅一次", "Edit title / cover / relation (one-time)")}
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">{tr("此作品已用完一次修改機會", "此作品已用完一次修改机会", "This post has used the one-time edit chance")}</span>
                )}
                <button onClick={removeVideo} className="rounded-lg border border-red-400/70 bg-red-50 px-3 py-1.5 text-sm text-red-600 dark:bg-red-500/10">
                  {tr("刪除作品", "删除作品", "Delete")}
                </button>
              </div>
            ) : null}

            <div className="mt-6">
              <h3 className="font-semibold">{tr("評論", "评论", "Comments")}</h3>
              {comments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{tr("暫無評論，快來搶沙發吧", "暂无评论，快来抢沙发吧", "No comments yet")}</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {comments.map((comment) => {
                    const account = comment?.account;
                    if (!account?.id) {
                      return (
                        <div key={comment.id} className="flex gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-2.5 dark:border-white/10 dark:bg-white/5">
                          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-slate-200" />
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{tr("用戶", "用户", "User")}</div>
                            <p className="mt-1 text-sm">{comment.body}</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={comment.id} className="flex gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-2.5 dark:border-white/10 dark:bg-white/5">
                        <Link href={`/video/account/${account.id}`}>
                          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
                            {account.avatarPath && (
                              <Image
                                src={`/uploads/${account.avatarPath}`}
                                alt={account.nickname || "user"}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                        </Link>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <Link href={`/video/account/${account.id}`} className="font-semibold text-sm">
                              {account.nickname || tr("用戶", "用户", "User")}
                            </Link>
                          </div>
                          <p className="mt-1 text-sm">{comment.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {commentsCursor && (
                <button
                  onClick={loadComments}
                  className="mt-3 text-sm text-blue-500"
                >
                  {tr("載入更多評論", "加载更多评论", "Load more comments")}
                </button>
              )}
            </div>
          </div>

          {showCommentInput && (
            <div className="border-t border-slate-200/80 bg-white/70 p-4 backdrop-blur dark:border-slate-700 dark:bg-black/10">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={tr("說點什麼...", "说点什么...", "Say something...")}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white/90 p-2 shadow-inner dark:border-slate-600 dark:bg-slate-800"
                rows={2}
              />
              {commentError ? <div className="mt-2 text-xs text-red-500">{commentError}</div> : null}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setShowCommentInput(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  {tr("取消", "取消", "Cancel")}
                </button>
                <button
                  onClick={handleComment}
                  disabled={submittingComment}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {submittingComment ? tr("發布中…", "发布中…", "Posting...") : tr("發布", "发布", "Post")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSharePicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/50 bg-gradient-to-br from-white/95 via-sky-50/80 to-white/92 p-4 shadow-2xl dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/92 dark:via-slate-900/85 dark:to-sky-950/28">
            <div className="text-base font-semibold">{tr("分享給指定對象", "分享给指定对象", "Share to...")}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShareMode("private")}
                className={`rounded-lg px-3 py-1.5 text-sm ${shareMode === "private" ? "bg-sky-500 text-white" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                {tr("私聊", "私聊", "Direct")}
              </button>
              <button
                onClick={() => setShareMode("group")}
                className={`rounded-lg px-3 py-1.5 text-sm ${shareMode === "group" ? "bg-sky-500 text-white" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                {tr("群組", "群组", "Group")}
              </button>
            </div>
            {shareMode === "private" ? (
              <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800">
                <option value="">{tr("請選擇私聊對象", "请选择私聊对象", "Select direct target")}</option>
                {privateTargets.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            ) : (
              <select value={targetRoomId} onChange={(e) => setTargetRoomId(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800">
                <option value="">{tr("請選擇群組", "请选择群组", "Select group")}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowSharePicker(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">{tr("取消", "取消", "Cancel")}</button>
              <button onClick={submitShare} className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white">{tr("確認分享", "确认分享", "Share")}</button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/50 bg-gradient-to-br from-white/95 via-sky-50/80 to-white/92 p-4 shadow-2xl dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/92 dark:via-slate-900/85 dark:to-sky-950/28">
            <div className="text-base font-semibold">{tr("編輯作品（一次機會）", "编辑作品 一次机会", "Edit post (one-time)")}</div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-sm font-medium">{tr("標題", "标题", "Title")}</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800" />
              </div>
              <div>
                <label className="text-sm font-medium">{tr("關聯已通過作品", "关联已通过作品", "Related approved photo")}</label>
                <select value={editRelatedPhotoId} onChange={(e) => setEditRelatedPhotoId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800">
                  <option value="">{tr("不關聯", "不关联", "No relation")}</option>
                  {approvedPhotos.map((p) => (
                    <option key={p.id} value={p.id}>{p.registration} · {p.aircraftModel || "-"} · {p.shotAt || "-"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{tr("封面（JPG/PNG，最大 5MB）", "封面 上传 JPG/PNG 最大5MB", "Cover (JPG/PNG, up to 5MB)")}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f && f.size > 5 * 1024 * 1024) {
                      alert(tr("封面不能超過 5MB", "封面不能超过5MB", "Cover must be smaller than 5MB"));
                      return;
                    }
                    setEditThumbnail(f);
                  }}
                  className="mt-1 block w-full"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">{tr("取消", "取消", "Cancel")}</button>
              <button onClick={submitEdit} className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white">{tr("保存修改", "保存修改", "Save")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
