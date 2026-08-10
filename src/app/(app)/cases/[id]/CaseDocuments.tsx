"use client";

import { useEffect, useState } from "react";

type Category = { id: string; name: string };
type Doc = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  categoryId: string | null;
};

export default function CaseDocuments({ caseId }: { caseId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  function load() {
    Promise.all([
      fetch(`/api/cases/${caseId}/documents`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([docsData, catsData]) => {
      setDocs(Array.isArray(docsData) ? docsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function handleUpload(categoryId: string | null, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFor(categoryId ?? "none");
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    if (categoryId) formData.append("categoryId", categoryId);

    const res = await fetch(`/api/cases/${caseId}/documents`, {
      method: "POST",
      body: formData,
    });

    setUploadingFor(null);
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

  async function saveRename(id: string) {
    const name = editingName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setEditingId(null);
    load();
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setAddingCategory(false);
    setNewCategoryName("");
    load();
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-4">المرفقات</h2>
        <p className="text-sm text-gray-400">جاري التحميل...</p>
      </div>
    );
  }

  const uncategorized = docs.filter((d) => !d.categoryId);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-ink">المرفقات</h2>
        <div className="flex items-center gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="اسم مجلد جديد"
            className="text-xs rounded-lg border border-gray-300 px-2 py-1.5 w-32"
          />
          <button
            onClick={addCategory}
            disabled={addingCategory}
            className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 disabled:opacity-60"
          >
            + مجلد
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="space-y-5">
        {categories.map((cat) => {
          const catDocs = docs.filter((d) => d.categoryId === cat.id);
          return (
            <div key={cat.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                {editingId === cat.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => saveRename(cat.id)}
                    onKeyDown={(e) => e.key === "Enter" && saveRename(cat.id)}
                    className="text-sm font-bold text-ink border border-primary-300 rounded-lg px-2 py-1"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditingName(cat.name);
                    }}
                    className="text-sm font-bold text-ink hover:text-primary-700 flex items-center gap-1.5"
                  >
                    📁 {cat.name}
                    <span className="text-gray-300 text-xs">✏️</span>
                  </button>
                )}
                <label className="text-xs text-primary-700 font-medium hover:underline cursor-pointer">
                  {uploadingFor === cat.id ? "جاري الرفع..." : "+ إرفاق"}
                  <input
                    type="file"
                    onChange={(e) => handleUpload(cat.id, e)}
                    disabled={uploadingFor === cat.id}
                    className="hidden"
                  />
                </label>
              </div>

              {catDocs.length === 0 ? (
                <p className="text-xs text-gray-400">لا توجد ملفات بهذا المجلد.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {catDocs.map((d) => (
                    <DocTile key={d.id} doc={d} onDelete={handleDelete} formatSize={formatSize} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-ink">📁 غير مصنّف</p>
            <label className="text-xs text-primary-700 font-medium hover:underline cursor-pointer">
              {uploadingFor === "none" ? "جاري الرفع..." : "+ إرفاق"}
              <input
                type="file"
                onChange={(e) => handleUpload(null, e)}
                disabled={uploadingFor === "none"}
                className="hidden"
              />
            </label>
          </div>
          {uncategorized.length === 0 ? (
            <p className="text-xs text-gray-400">لا توجد ملفات هنا.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {uncategorized.map((d) => (
                <DocTile key={d.id} doc={d} onDelete={handleDelete} formatSize={formatSize} />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">الحد الأقصى لحجم الملف 10 ميجابايت</p>
    </div>
  );
}

function DocTile({
  doc,
  onDelete,
  formatSize,
}: {
  doc: Doc;
  onDelete: (id: string) => void;
  formatSize: (bytes: number | null) => string;
}) {
  return (
    <div className="relative flex flex-col items-center border border-gray-100 rounded-xl p-3 hover:border-primary-200 hover:bg-primary-50/30 transition">
      <button
        onClick={() => onDelete(doc.id)}
        className="absolute top-1.5 left-1.5 text-gray-300 hover:text-red-600 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 transition"
        title="حذف"
      >
        ✕
      </button>
      <a
        href={doc.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-2 w-full"
      >
        <p className="text-xs font-medium text-ink text-center break-words line-clamp-2 w-full px-1">
          {doc.fileName}
        </p>
        <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700 text-xl">
          📄
        </div>
        <span className="text-[11px] text-gray-400">{formatSize(doc.fileSize)}</span>
      </a>
    </div>
  );
}
