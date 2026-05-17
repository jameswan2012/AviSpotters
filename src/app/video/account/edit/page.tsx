"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Account = {
  id: string;
  nickname: string;
  region: string | null;
  gender: string | null;
  bio: string | null;
  isPublic: boolean;
  avatarPath: string | null;
};

export default function VideoAccountEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  const [nickname, setNickname] = useState("");
  const [region, setRegion] = useState("");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/video/account");
        const data = (await res.json()) as { hasAccount?: boolean; account?: Account; error?: string };
        if (!res.ok) throw new Error(data.error || "加载失败");
        if (!data.hasAccount || !data.account) {
          router.replace("/video/account/create");
          return;
        }
        setAccount(data.account);
        setNickname(data.account.nickname || "");
        setRegion(data.account.region || "");
        setGender(data.account.gender || "");
        setBio(data.account.bio || "");
        setIsPublic(!!data.account.isPublic);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setSaving(true);
    setError(null);
    try {
      const lowered = nickname.trim().toLowerCase();
      const reserved = new Set(["admin", "administrator", "root", "system", "official", "support", "管理员", "管理員", "客服"]);
      if (reserved.has(lowered)) {
        throw new Error("昵称不可用");
      }
      const fd = new FormData();
      fd.set("nickname", nickname.trim());
      fd.set("region", region.trim());
      fd.set("gender", gender.trim());
      fd.set("bio", bio.trim());
      fd.set("isPublic", String(isPublic));
      if (avatarFile) fd.set("avatar", avatarFile);

      const res = await fetch(`/api/video/account/${account.id}`, {
        method: "PUT",
        body: fd,
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "保存失败");
      router.push(`/video/account/${account.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-900">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">编辑资料</h1>
          <Link href={account ? `/video/account/${account.id}` : "/video"} className="text-sm text-slate-500 hover:underline">
            返回
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div>
            <label className="block text-sm font-medium">头像</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full"
            />
            <p className="mt-1 text-xs text-slate-500">JPG/PNG，最大 15MB</p>
          </div>

          <div>
            <label className="block text-sm font-medium">昵称</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={2}
              maxLength={30}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">地区</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">性别</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">请选择</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">简介</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={200}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            公开账号
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-blue-500 py-2.5 font-medium text-white hover:bg-blue-600 disabled:opacity-60"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </form>
      </div>
    </div>
  );
}

