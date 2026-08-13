"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };

export default function ServiceRequestUpload({
  token,
  requestId,
  categories,
}: {
  token: string;
  requestId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    if (categoryId) formData.append("categoryId", categoryId);

    const res = await fetch(`/api/portal/${token}/service-requests/${requestId}/documents`, {
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
    router.refresh();
  }

  return (
    <div className="mt-2 space-y-2">
      {categories.length > 0 && (
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="text-xs rounded-lg border border-gray-300 px-2 py-1.5"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      <label className="text-xs text-primary-700 font-medium hover:underline cursor-pointer bg-primary-50 rounded-lg px-2 py-1 inline-block mr-2">
        {uploading ? "جاري الرفع..." : "+ إرفاق المستند"}
        <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
