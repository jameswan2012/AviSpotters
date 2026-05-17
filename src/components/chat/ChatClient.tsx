"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/shared";
import { getRoleLabel, getRoleMeta } from "@/lib/roles";

type Room = {
  id: string;
  type: "public" | "direct" | string;
  name: string | null;
  updatedAt: string | Date;
  directKey?: string | null;
  directUser?: { id: string; name: string | null; email: string; roleId: number; avatarUpdatedAt?: string | Date | null } | null;
};

type Attachment = {
  type?: string;
  path?: string;
  mime?: string;
  videoId?: string;
  url?: string;
  title?: string;
  authorName?: string;
  thumbnailUrl?: string | null;
};

type Msg = {
  id: string;
  kind: "text" | "image" | string;
  body: string;
  attachmentsJson: string | null;
  createdAt: string | Date;
  user: { id: string; name: string | null; email: string; roleId: number; avatarUpdatedAt?: string | Date | null };
};

function toIso(v: string | Date) {
  return typeof v === "string" ? v : v.toISOString();
}

function safeParseAttachments(raw: string | null): Attachment[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as any[]) : [];
  } catch {
    return [];
  }
}

function renderTextWithLinks(text: string) {
  const parts: (string | { url: string })[] = [];
  const re = /(https?:\/\/[^\s]+)/g;
  let last = 0;
  for (;;) {
    const m = re.exec(text);
    if (!m) break;
    const idx = m.index;
    const url = m[1] || "";
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push({ url });
    last = idx + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return parts.map((p, i) => {
    if (typeof p === "string") return <span key={i}>{p}</span>;
    return (
      <a
        key={i}
        href={p.url}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-sky-400/60 underline-offset-2 hover:decoration-sky-400"
      >
        {p.url}
      </a>
    );
  });
}

export function ChatClient({
  locale,
  me,
  canCreateRoom,
  initialRoomId,
  initialRooms,
  initialMessages,
}: {
  locale: Locale;
  me: { id: string; name: string; roleId: number };
  canCreateRoom: boolean;
  initialRoomId: string;
  initialRooms: Room[];
  initialMessages: Msg[];
}) {
  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);

  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);

  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<
    {
      role: string;
      mutedUntil: string | Date | null;
      user: { id: string; name: string | null; email: string; roleId: number; avatarUpdatedAt?: string | Date | null; chatReadReceiptsEnabled?: boolean };
    }[]
  >([]);
  const [canModerate, setCanModerate] = useState(false);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [readReceipt, setReadReceipt] = useState<{ otherLastReadAt: string | null; otherEnabled: boolean } | null>(null);

  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState("");

  const [dmQ, setDmQ] = useState("");
  const [dmUsers, setDmUsers] = useState<{ id: string; name: string | null; email: string; roleId: number; avatarUpdatedAt?: string | Date | null }[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadingRef = useRef(false);
  const lastUploadKeyRef = useRef<string>("");
  const lastUploadAtRef = useRef<number>(0);
  const lastTsRef = useRef<string>(initialMessages.length ? toIso(initialMessages[initialMessages.length - 1]!.createdAt) : "");

  const currentRoom = useMemo(() => rooms.find((r) => r.id === roomId) ?? null, [rooms, roomId]);
  const currentTitle = useMemo(() => {
    if (!currentRoom) return roomId;
    if (currentRoom.id === "lobby") return tr("全體審核員+", "全体审核员+", "All Screeners+");
    if (currentRoom.type === "direct") return currentRoom.directUser?.name ?? currentRoom.directUser?.email ?? tr("私聊", "私聊", "Direct");
    return currentRoom.name || currentRoom.id;
  }, [currentRoom, roomId, tr]);

  const meRoleLabel = useMemo(() => getRoleLabel(locale as any, me.roleId), [locale, me.roleId]);

  function avatarUrl(userId: string, updatedAt?: string | Date | null) {
    if (!updatedAt) return null;
    const ts = typeof updatedAt === "string" ? new Date(updatedAt).getTime() : updatedAt.getTime();
    if (!Number.isFinite(ts)) return null;
    return `/api/users/${encodeURIComponent(userId)}/avatar?v=${ts}`;
  }

  function displayName(u: { name: string | null; email: string }) {
    return (u.name ?? u.email) || tr("未知用戶", "未知用户", "Unknown");
  }

  function friendlyError(code: string) {
    const c = String(code || "").trim();
    if (!c) return tr("操作失敗", "操作失败", "Operation failed");
    if (c === "unauthorized") return tr("未登入", "未登录", "Not signed in");
    if (c === "forbidden") return tr("沒有權限", "没有权限", "No permission");
    if (c === "banned") return tr("你已被封鎖，無法操作", "你已被封锁，无法操作", "You are banned");
    if (c === "muted") return tr("你已被禁言，暫時無法發言/上傳", "你已被禁言，暂时无法发言/上传", "You are muted");
    if (c === "roomId_required") return tr("房間 ID 缺失", "房间 ID 缺失", "Room ID required");
    if (c === "file_required") return tr("請選擇檔案", "请选择文件", "Please pick a file");
    if (c === "only_jpg_png_mp4_webm") return tr("只支援 JPG/PNG/MP4/WebM", "只支持 JPG/PNG/MP4/WebM", "Only JPG/PNG/MP4/WebM supported");
    if (c === "file_too_large") return tr("檔案太大", "文件太大", "File too large");
    if (c === "unsafe_file_type") return tr("檔案格式不安全或不符合", "文件格式不安全或不符合", "Unsafe file type");
    if (c === "virus_found") return tr("安全掃描：檔案疑似含惡意內容，已拒絕", "安全扫描：文件疑似含恶意内容，已拒绝", "Security scan: rejected");
    if (c === "scan_unavailable") return tr("安全掃描暫不可用，請稍後再試", "安全扫描暂不可用，请稍后再试", "Security scan unavailable");
    if (c === "upload_security_failed") return tr("上傳檔案安全檢查失敗", "上传文件安全检查失败", "Upload security check failed");
    if (c === "bad_request") return tr("請填寫內容", "请填写内容", "Please enter a message");
    if (c === "too_long") return tr("內容太長", "内容太长", "Message too long");
    if (c === "send_failed") return tr("送出失敗", "发送失败", "Send failed");
    if (c === "upload_failed") return tr("上傳失敗", "上传失败", "Upload failed");
    if (c === "dm_failed") return tr("私聊失敗", "私聊失败", "DM failed");
    if (c === "create_failed") return tr("建立失敗", "创建失败", "Create failed");
    if (c === "join_failed") return tr("加入失敗", "加入失败", "Join failed");
    if (c === "leave_failed") return tr("離開失敗", "离开失败", "Leave failed");
    return c;
  }

  function setFriendlyError(e: unknown, fallback: string) {
    if (e instanceof Error) {
      setError(friendlyError(e.message) || fallback);
      return;
    }
    setError(fallback);
  }

  useEffect(() => {
    let stopped = false;
    const run = async () => {
      try {
        const res = await fetch("/api/chat/settings", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as any;
        if (!stopped) setReadReceiptsEnabled(json?.chatReadReceiptsEnabled !== false);
      } catch {
      }
    };
    void run();
    return () => {
      stopped = true;
    };
  }, []);

  async function saveReadReceipts(enabled: boolean) {
    setReadReceiptsEnabled(enabled);
    try {
      await fetch("/api/chat/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatReadReceiptsEnabled: enabled }),
      });
    } catch {
    }
  }

  async function refreshRoomsOnce() {
    const res = await fetch("/api/chat/rooms", { cache: "no-store" });
    const json = (await res.json()) as any;
    if (json?.rooms && Array.isArray(json.rooms)) setRooms(json.rooms);
  }

  useEffect(() => {
    let timer: number | null = null;
    let stopped = false;

    const refreshPublicRooms = async () => {
      try {
        const res = await fetch("/api/chat/public-rooms", { cache: "no-store" });
        const json = (await res.json()) as any;
        if (json?.rooms && Array.isArray(json.rooms)) setPublicRooms(json.rooms);
      } catch {
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const after = lastTsRef.current ? `?after=${encodeURIComponent(lastTsRef.current)}` : "";
        const res = await fetch(`/api/chat/rooms/${encodeURIComponent(roomId)}/messages${after}`, { cache: "no-store" });
        const json = (await res.json()) as any;
        const next = Array.isArray(json?.messages) ? (json.messages as Msg[]) : [];
        if (json?.readReceipt && typeof json.readReceipt === "object") setReadReceipt(json.readReceipt);
        if (next.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const merged = [...prev, ...next.filter((m) => !seen.has(m.id))];
            const last = merged[merged.length - 1];
            if (last) lastTsRef.current = toIso(last.createdAt);
            return merged;
          });
        }
      } catch {
      }
    };

    const start = () => {
      if (timer != null) window.clearInterval(timer);
      void refreshRoomsOnce();
      void refreshPublicRooms();
      void poll();
      timer = window.setInterval(() => {
        void poll();
      }, 2500);
    };

    start();
    return () => {
      stopped = true;
      if (timer != null) window.clearInterval(timer);
    };
  }, [roomId]);

  async function switchRoom(nextId: string) {
    setError(null);
    setRoomId(nextId);
    setMessages([]);
    setReadReceipt(null);
    lastTsRef.current = "";
    try {
      const res = await fetch(`/api/chat/rooms/${encodeURIComponent(nextId)}/messages?limit=50`, { cache: "no-store" });
      const json = (await res.json()) as any;
      const next = Array.isArray(json?.messages) ? (json.messages as Msg[]) : [];
      setMessages(next);
      if (json?.readReceipt && typeof json.readReceipt === "object") setReadReceipt(json.readReceipt);
      const last = next[next.length - 1];
      lastTsRef.current = last ? toIso(last.createdAt) : "";
    } catch {
      setError(tr("讀取失敗", "读取失败", "Failed to load"));
    }
  }

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId, body }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.message) throw new Error(json?.error || "send_failed");
      const msg = json.message as Msg;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      lastTsRef.current = toIso(msg.createdAt);
      setText("");
    } catch (e) {
      setFriendlyError(e, tr("送出失敗", "发送失败", "Send failed"));
    } finally {
      setSending(false);
    }
  }

  async function createRoom() {
    const name = roomName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.room?.id) throw new Error(json?.error || "create_failed");
      setRoomName("");
      await refreshRoomsOnce();
      void switchRoom(json.room.id);
    } catch (e) {
      setFriendlyError(e, tr("建立失敗", "创建失败", "Failed to create"));
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/chat/rooms/${encodeURIComponent(id)}/join`, { method: "POST" });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error || "join_failed");
      await refreshRoomsOnce();
      void switchRoom(id);
    } catch (e) {
      setFriendlyError(e, tr("加入失敗", "加入失败", "Failed to join"));
    }
  }

  async function leaveRoom(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/chat/rooms/${encodeURIComponent(id)}/leave`, { method: "POST" });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error || "leave_failed");
      await refreshRoomsOnce();
      if (roomId === id) void switchRoom("lobby");
    } catch (e) {
      setFriendlyError(e, tr("離開失敗", "离开失败", "Failed to leave"));
    }
  }

  async function openMembers() {
    setMembersOpen(true);
    try {
      const res = await fetch(`/api/chat/rooms/${encodeURIComponent(roomId)}/members`, { cache: "no-store" });
      const json = (await res.json()) as any;
      if (Array.isArray(json?.members)) setMembers(json.members);
      setCanModerate(!!json?.canModerate);
    } catch {
    }
  }

  async function moderate(action: "mute" | "kick" | "ban" | "unban", userId: string) {
    setError(null);
    let minutes: number | null = null;
    let reason: string | null = null;
    if (action === "mute" || action === "ban") {
      const v = window.prompt(
        tr("輸入分鐘數（例如 10 / 60）。留空=永久。", "输入分钟数（例如 10 / 60）。留空=永久。", "Minutes (e.g. 10/60). Empty = permanent."),
        "10"
      );
      minutes = v && v.trim() ? Number(v.trim()) : null;
    }
    if (action === "kick" || action === "ban") {
      const v = window.prompt(tr("原因（可選）", "原因（可选）", "Reason (optional)"), "");
      reason = v == null ? null : v.trim();
    }
    try {
      const res = await fetch(`/api/chat/rooms/${encodeURIComponent(roomId)}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, userId, minutes, reason }),
      });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error || "forbidden");
      await openMembers();
    } catch (e) {
      setFriendlyError(e, tr("操作失敗", "操作失败", "Operation failed"));
    }
  }

  async function searchDmUsers(q: string) {
    setDmQ(q);
    if (!q.trim()) {
      setDmUsers([]);
      return;
    }
    try {
      const res = await fetch(`/api/chat/users?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
      const json = (await res.json()) as any;
      setDmUsers(Array.isArray(json?.users) ? json.users : []);
    } catch {
      setDmUsers([]);
    }
  }

  async function startDm(userId: string) {
    setError(null);
    try {
      const res = await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.roomId) throw new Error(json?.error || "dm_failed");
      setDmQ("");
      setDmUsers([]);
      await refreshRoomsOnce();
      void switchRoom(json.roomId);
    } catch (e) {
      setFriendlyError(e, tr("私聊失敗", "私聊失败", "DM failed"));
    }
  }

  async function sendFile(file: File) {
    setError(null);
    if (uploadingRef.current) return;
    const key = `${file.name}|${file.size}|${file.lastModified}`;
    const nowMs = Date.now();
    if (lastUploadKeyRef.current === key && nowMs - lastUploadAtRef.current < 3000) return;
    lastUploadKeyRef.current = key;
    lastUploadAtRef.current = nowMs;
    uploadingRef.current = true;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("roomId", roomId);
      fd.set("file", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.message) throw new Error(json?.error || "upload_failed");
      const msg = json.message as Msg;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      lastTsRef.current = toIso(msg.createdAt);
    } catch (e) {
      setFriendlyError(e, tr("上傳失敗", "上传失败", "Upload failed"));
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white/92 via-sky-50/65 to-white/90 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/75 dark:via-sky-950/25 dark:to-slate-900/75">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("聊天室", "聊天室", "Chat")}</div>
          <button
            type="button"
            onClick={() => void switchRoom("lobby")}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("回審核員群", "回审核员群", "Screeners+")}
          </button>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{tr("我的房間", "我的房间", "My rooms")}</div>
          <div className="mt-2 space-y-2">
            {rooms.map((r) => {
              const label =
                r.id === "lobby"
                  ? tr("全體審核員+", "全体审核员+", "All Screeners+")
                  : r.type === "direct"
                    ? r.directUser?.name ?? r.directUser?.email ?? tr("私聊", "私聊", "Direct")
                    : r.name || r.id;
              const active = r.id === roomId;
              return (
                <div key={r.id} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void switchRoom(r.id)}
                    className={[
                      "w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold",
                      active
                        ? "border-sky-400/40 bg-sky-500/10 text-slate-900 dark:text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                  {r.id !== "lobby" ? (
                    <button
                      type="button"
                      onClick={() => void leaveRoom(r.id)}
                      className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      title={tr("離開", "离开", "Leave")}
                    >
                      {tr("離開", "离开", "Leave")}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{tr("建立群組", "创建群组", "Create room")}</div>
          {canCreateRoom ? (
            <div className="mt-2 flex gap-2">
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={tr("房間名稱…", "房间名称…", "Room name…")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => void createRoom()}
                disabled={creating || !roomName.trim()}
                className="shrink-0 rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
              >
                {creating ? "…" : tr("建立", "创建", "Create")}
              </button>
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {tr("僅高級管理員可建立群組。", "仅高级管理员可创建群组。", "Only Super Admin can create rooms.")}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{tr("公開房間", "公开房间", "Public rooms")}</div>
          <div className="mt-2 max-h-[220px] space-y-2 overflow-auto pr-1">
            {publicRooms
              .filter((r) => r.type === "public")
              .slice(0, 30)
              .map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {r.id === "lobby" ? tr("全體審核員+", "全体审核员+", "All Screeners+") : r.name || r.id}
                  </div>
                  <button
                    type="button"
                    onClick={() => void joinRoom(r.id)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                  >
                    {tr("加入", "加入", "Join")}
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{tr("私聊", "私聊", "Direct message")}</div>
          <input
            value={dmQ}
            onChange={(e) => void searchDmUsers(e.target.value)}
            placeholder={tr("搜尋暱稱/Email…", "搜索昵称/Email…", "Search name/email…")}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          />
          {dmUsers.length ? (
            <div className="mt-2 space-y-2">
              {dmUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => void startDm(u.id)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName(u)}</div>
                  <div className="truncate text-[11px] text-slate-600 dark:text-slate-300">{u.email}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </aside>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white/95 via-white/88 to-sky-50/55 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/82 dark:via-slate-900/72 dark:to-sky-950/22">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/60 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentTitle}</div>
            {currentRoom?.type === "direct" ? (
              <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                {readReceipt
                  ? readReceipt.otherEnabled
                    ? tr("已讀回執可用", "已读回执可用", "Read receipts available")
                    : tr("對方已關閉已讀", "对方已关闭已读", "Other disabled read receipts")
                  : ""}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={readReceiptsEnabled}
                onChange={(e) => void saveReadReceipts(e.target.checked)}
                className="h-4 w-4"
              />
              {tr("已讀回執", "已读回执", "Read receipts")}
            </label>
            <button
              type="button"
              onClick={() => void openMembers()}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              {tr("成員", "成员", "Members")}
            </button>
            <div className="text-xs text-slate-600 dark:text-slate-300">{me.name} · {meRoleLabel}</div>
          </div>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-auto bg-gradient-to-b from-white/25 via-transparent to-white/20 px-4 py-4 dark:from-transparent dark:to-black/10">
          {messages.length ? (
            messages.map((m) => {
              const mine = m.user.id === me.id;
              const name = (m.user.name ?? m.user.email) || "unknown";
              const atts = safeParseAttachments(m.attachmentsJson);
              const img = m.kind === "image" ? atts.find((a) => a?.type === "image") : null;
              const vid = m.kind === "video" ? atts.find((a) => a?.type === "video") : null;
              const videoShare = atts.find((a) => a?.type === "video_share");
              const roleMeta = getRoleMeta(m.user.roleId);
              const roleLabel = getRoleLabel(locale as any, m.user.roleId);
              const ava = avatarUrl(m.user.id, m.user.avatarUpdatedAt ?? null);
              const ts = typeof m.createdAt === "string" ? new Date(m.createdAt) : m.createdAt;
              const otherRead = !!readReceipt?.otherLastReadAt && new Date(readReceipt.otherLastReadAt).getTime() >= ts.getTime();
              return (
                <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl border px-3 py-2 text-sm shadow-sm backdrop-blur",
                      mine
                        ? "border-sky-300/40 bg-gradient-to-br from-sky-500/20 to-indigo-500/15 text-slate-900 dark:border-sky-400/30 dark:text-white"
                        : "border-slate-200/70 bg-gradient-to-br from-white/95 to-slate-50/95 text-slate-900 dark:border-white/10 dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 dark:text-slate-100",
                    ].join(" ")}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <div className="h-6 w-6 overflow-hidden rounded-full border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
                        {ava ? (
                          <img src={ava} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[11px] font-extrabold text-slate-500 dark:text-slate-200">
                            {name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{name}</div>
                          <span className={["inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold", roleMeta.pillClass].join(" ")}>
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    {img ? (
                      <img
                        src={`/api/chat/messages/${encodeURIComponent(m.id)}/file`}
                        alt="chat image"
                        className="max-h-[360px] w-auto rounded-xl border border-black/10 dark:border-white/10"
                      />
                    ) : vid ? (
                      <video
                        controls
                        src={`/api/chat/messages/${encodeURIComponent(m.id)}/file`}
                        className="max-h-[360px] w-auto rounded-xl border border-black/10 dark:border-white/10"
                      />
                    ) : videoShare ? (
                      <a
                        href={videoShare.url || (videoShare.videoId ? `/video/${encodeURIComponent(videoShare.videoId)}` : "#")}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-slate-200 bg-white/90 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/10 dark:bg-white/5"
                      >
                        {videoShare.thumbnailUrl ? (
                          <img
                            src={videoShare.thumbnailUrl}
                            alt={videoShare.title || "video share"}
                            className="h-36 w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-24 place-items-center bg-gradient-to-br from-rose-500/15 via-orange-400/10 to-sky-500/15 text-xs font-semibold text-slate-600 dark:text-slate-200">
                            {tr("影片預覽", "视频预览", "Video preview")}
                          </div>
                        )}
                        <div className="space-y-1 p-3">
                          <div className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {videoShare.title || tr("未命名影片", "未命名视频", "Untitled video")}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            {videoShare.authorName || "AviSpotters"} · {tr("點擊查看", "点击查看", "Tap to open")}
                          </div>
                        </div>
                      </a>
                    ) : (
                      <div className="whitespace-pre-wrap leading-6">{renderTextWithLinks(m.body)}</div>
                    )}
                    {currentRoom?.type === "direct" && mine ? (
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                        {readReceipt?.otherEnabled ? (otherRead ? tr("已讀", "已读", "Read") : tr("未讀", "未读", "Unread")) : tr("對方關閉已讀", "对方关闭已读", "No receipt")}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">{tr("尚無訊息", "暂无消息", "No messages yet")}</div>
          )}
        </div>

        <div className="border-t border-slate-200/80 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
          {error ? <div className="mb-2 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
          <div className="mb-2 flex flex-wrap gap-2">
            {["👍", "😂", "🔥", "❤️", "😮", "🤝", "✈️", "📷"].map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setText((t) => (t ? `${t} ${e}` : e))}
                className="rounded-xl border border-slate-200/80 bg-white/90 px-2 py-1 text-sm shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title={tr("插入表情", "插入表情", "Insert emoji")}
              >
                {e}
              </button>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              {uploading ? tr("上傳中…", "上传中…", "Uploading…") : tr("圖片/影片", "图片/视频", "Image/Video")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,video/mp4,video/webm,.jpg,.jpeg,.png,.mp4,.webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                e.currentTarget.value = "";
                if (f) void sendFile(f);
              }}
              disabled={uploading}
            />
          </div>

          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder={tr("輸入訊息…", "输入消息…", "Type a message…")}
              className="min-h-[44px] w-full resize-none rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
              className="shrink-0 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-sky-400 hover:to-indigo-400 disabled:opacity-60"
            >
              {sending ? "…" : tr("送出", "发送", "Send")}
            </button>
          </div>

          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
            {tr("快捷鍵：Ctrl/⌘ + Enter 送出", "快捷键：Ctrl/⌘ + Enter 发送", "Shortcut: Ctrl/⌘ + Enter to send")}
          </div>
        </div>
      </section>

      {membersOpen ? (
        <div className="fixed inset-0 z-[90] bg-black/55 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-10 w-full max-w-2xl rounded-3xl border border-white/50 bg-gradient-to-br from-white/95 via-sky-50/80 to-white/92 p-4 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-sky-950/35 dark:to-slate-900/85 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold">{tr("成員", "成员", "Members")}</div>
              <button
                type="button"
                onClick={() => setMembersOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                {tr("關閉", "关闭", "Close")}
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {members.map((m) => {
                const name = m.user.name ?? m.user.email;
                const muted = m.mutedUntil ? new Date(m.mutedUntil).getTime() > Date.now() : false;
                const roleMeta = getRoleMeta(m.user.roleId);
                const roleLabel = getRoleLabel(locale as any, m.user.roleId);
                const ava = avatarUrl(m.user.id, m.user.avatarUpdatedAt ?? null);
                const moderationAllowed = canModerate && roomId !== "superadmins";
                return (
                  <div
                    key={m.user.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 overflow-hidden rounded-full border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
                          {ava ? (
                            <img src={ava} alt="avatar" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[11px] font-extrabold text-slate-500 dark:text-slate-200">
                              {name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-semibold">{name}</div>
                            <span className={["inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold", roleMeta.pillClass].join(" ")}>
                              {roleLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="truncate text-[11px] text-slate-600 dark:text-slate-300">
                        {m.role}
                        {muted ? ` · ${tr("禁言中", "禁言中", "Muted")}` : ""}
                      </div>
                    </div>
                    {moderationAllowed && m.user.id !== me.id ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void moderate("mute", m.user.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          {tr("禁言", "禁言", "Mute")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void moderate("kick", m.user.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          {tr("踢出", "踢出", "Kick")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void moderate("ban", m.user.id)}
                          className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                        >
                          {tr("封禁", "封禁", "Ban")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void moderate("unban", m.user.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          {tr("解封", "解封", "Unban")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
