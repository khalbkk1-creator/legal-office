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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="mb-4">
          {docs.length === 0 && <p className="text-sm text-gray-400">لا توجد مرفقات لهذه القضية.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {docs.map((d) => (
              <div
                key={d.id}
                className="relative flex flex-col items-center border border-gray-100 rounded-xl p-3 hover:border-primary-200 hover:bg-primary-50/30 transition"
              >
                <button
                  onClick={() => handleDelete(d.id)}
                  className="absolute top-1.5 left-1.5 text-gray-300 hover:text-red-600 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 transition"
                  title="حذف"
                >
                  ✕
                </button>
                
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 w-full"
                >
                  <p className="text-xs font-medium text-ink text-center break-words line-clamp-2 w-full px-1">
                    {d.fileName}
                  </p>
                  <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700 text-xl">
                    📄
                  </div>
                  <span className="text-[11px] text-gray-400">{formatSize(d.fileSize)}</span>
                </a>
              </div>
            ))}
          </div>
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
