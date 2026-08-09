"use client";

import { useEffect, useState } from "react";

type Doc = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  createdAt: string;
  uploadedBy?: { name: string } | null;
};

export default function CaseDocuments({ caseId }: { caseId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch(`/api/cases/${caseId}/documents`)
      .then((r) => r.json())
      .then((data) => {
        setDocs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [caseId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/cases/${caseId}/documents`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    e.target.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر رفع الملف");
      return;
    }
    load();
  }

  async function handleDelete(docId: string) {
    if (!confirm("متأكد تبي تحذف هذا الملف؟")) return;
    await fetch(`/api/cases/${caseId}/documents/${docId}`, { method: "DELETE" });
    load();
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-4">المرفقات</h2>

      {loading ? (
        <p className="text-sm text-gray-400">جاري التحميل...</p>
      ) : (
        <div className="space-y-2 mb-4">
          {docs.length === 0 && <p className="text-sm text-gray-400">لا توجد مرفقات لهذه القضية.</p>}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
              
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary-700 hover:underline min-w-0"
              >
                <span>📎</span>
                <span className="truncate">{d.fileName}</span>
              </a>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-400">{formatSize(d.fileSize)}</span>
                <button onClick={() => handleDelete(d.id)} className="text-xs text-red-600 hover:underline">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

      <label className="inline-block cursor-pointer text-sm text-primary-700 font-medium hover:underline">
        {uploading ? "جاري الرفع..." : "+ إرفاق ملف"}
        <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>
      <p className="text-xs text-gray-400 mt-1">الحد الأقصى لحجم الملف 10 ميجابايت</p>
    </div>
  );
}
