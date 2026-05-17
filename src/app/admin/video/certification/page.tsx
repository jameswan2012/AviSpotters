"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface Certification {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  account: {
    id: string;
    nickname: string;
    avatarPath: string | null;
    certificationScore: number;
    user: { email: string };
  };
}

export default function VideoCertificationPage() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/video/certification?status=pending");
      const data = await res.json();
      if (data.certifications) {
        setCertifications(data.certifications);
        if (data.certifications.length > 0 && !selectedCert) {
          setSelectedCert(data.certifications[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load certifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (decision: "approved" | "rejected") => {
    if (!selectedCert) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/video/certification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificationId: selectedCert.id,
          decision,
          rejectReason: decision === "rejected" ? rejectReason : null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setCertifications((prev) => prev.filter((c) => c.id !== selectedCert.id));
        setSelectedCert(null);
        setRejectReason("");
        setTimeout(() => loadCertifications(), 100);
      } else {
        alert(data.error || "操作失败");
      }
    } catch (error) {
      console.error("Review failed:", error);
      alert("操作失败");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">认证审核</h1>
        <div className="flex gap-2">
          <Link href="/admin/video/review" className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-700">
            视频审核
          </Link>
          <Link href="/admin/video/tags" className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-700">
            管理标签
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：申请列表 */}
        <div className="col-span-1 space-y-2">
          <h2 className="font-medium">待审核 ({certifications.length})</h2>
          {certifications.length === 0 ? (
            <p className="text-slate-500">暂无待审核申请</p>
          ) : (
            <div className="space-y-2">
              {certifications.map((cert) => (
                <button
                  key={cert.id}
                  onClick={() => setSelectedCert(cert)}
                  className={`flex w-full items-center gap-2 rounded-lg p-2 text-left ${
                    selectedCert?.id === cert.id
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                    {cert.account.avatarPath ? (
                      <Image src={`/uploads/${cert.account.avatarPath}`} alt={cert.account.nickname} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-300 text-sm font-bold">
                        {cert.account.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{cert.account.nickname}</p>
                    <p className="text-xs text-slate-500">{cert.type === "white" ? "白色对勾" : "黄色对勾"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 中间+右侧：审核操作 */}
        <div className="col-span-2 space-y-4">
          <h2 className="font-medium">审核</h2>
          {selectedCert ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                <h3 className="font-medium">申请信息</h3>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full">
                    {selectedCert.account.avatarPath ? (
                      <Image src={`/uploads/${selectedCert.account.avatarPath}`} alt={selectedCert.account.nickname} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-300 text-xl font-bold">
                        {selectedCert.account.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{selectedCert.account.nickname}</p>
                    <p className="text-sm text-slate-500">{selectedCert.account.user.email}</p>
                    <p className="text-sm">当前评分: {selectedCert.account.certificationScore}</p>
                  </div>
                </div>
                <p className="mt-2">
                  申请类型: <span className="font-medium">{selectedCert.type === "white" ? "白色对勾" : "黄色对勾"}</span>
                </p>
                <p className="text-sm text-slate-500">
                  申请时间: {new Date(selectedCert.createdAt).toLocaleString()}
                </p>
                {selectedCert.type === "white" && (
                  <p className="mt-1 text-sm text-green-500">通过后: 评分+10</p>
                )}
                {selectedCert.type === "yellow" && (
                  <p className="mt-1 text-sm text-green-500">通过后: 评分+30</p>
                )}
              </div>

              <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                <h3 className="font-medium">拒绝原因</h3>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-2 w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-700"
                  rows={3}
                  placeholder="请输入拒绝原因（可选）"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleReview("approved")}
                  disabled={processing}
                  className="flex-1 rounded-lg bg-green-500 py-3 font-medium text-white hover:bg-green-600 disabled:opacity-50"
                >
                  通过
                </button>
                <button
                  onClick={() => handleReview("rejected")}
                  disabled={processing}
                  className="flex-1 rounded-lg bg-red-500 py-3 font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  拒绝
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <p className="text-slate-500">选择申请进行审核</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
