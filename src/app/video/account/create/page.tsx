"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VideoAccountCreatePage() {
  const [loading, setLoading] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nickname, setNickname] = useState("");
  const [region, setRegion] = useState("");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [approvedPhotoCount, setApprovedPhotoCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    checkAccount();
  }, []);

  useEffect(() => {
    if (hasAccount) {
      router.replace("/video/account/edit");
    }
  }, [hasAccount, router]);

  const checkAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/video/account");
      const data = await res.json();
      if (data.hasAccount) {
        setHasAccount(true);
        setAccountInfo(data.account);
      } else {
        setHasAccount(false);
        setApprovedPhotoCount(data.approvedPhotoCount || 0);
      }
    } catch (error) {
      console.error("Failed to check account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const lowered = nickname.trim().toLowerCase();
      const reserved = new Set(["admin", "administrator", "root", "system", "official", "support", "管理员", "管理員", "客服"]);
      if (reserved.has(lowered)) {
        setError("昵称不可用");
        return;
      }
      const formData = new FormData();
      formData.append("nickname", nickname);
      formData.append("region", region);
      formData.append("gender", gender);
      formData.append("bio", bio);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch("/api/video/account", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        router.push("/video");
      } else {
        setError(data.error || "创建失败");
      }
    } catch (error) {
      setError("创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // 如果已有账号，跳转到编辑页面
  if (hasAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-slate-600 dark:text-slate-300">正在跳转到账号编辑页…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-900">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold">开通视频账号</h1>

        {approvedPhotoCount < 10 && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-600 dark:bg-red-900">
            <p>您需要至少10张审核通过的照片才能开通视频账号。</p>
            <p className="mt-1">当前审核通过照片: {approvedPhotoCount} 张</p>
            <Link href="/photos/upload" className="mt-2 inline-block text-sm underline">
              去上传照片
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-600 dark:bg-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div>
            <label className="block text-sm font-medium">头像 (可选)</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full"
            />
            <p className="mt-1 text-xs text-slate-500">支持 JPG、PNG，最大 15MB</p>
          </div>

          <div>
            <label className="block text-sm font-medium">昵称 *</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              minLength={2}
              maxLength={30}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-700"
              placeholder="2-30个字符"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">地区 (可选)</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-700"
              placeholder="例如：台湾"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">性别 (可选)</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-700"
            >
              <option value="">请选择</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">个人介绍 (可选)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-700"
              placeholder="介绍一下自己吧"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || approvedPhotoCount < 10}
            className="w-full rounded-lg bg-blue-500 py-3 font-medium text-white hover:bg-blue-600 disabled:bg-slate-300"
          >
            {submitting ? "创建中..." : "开通视频账号"}
          </button>
        </form>
      </div>
    </div>
  );
}
