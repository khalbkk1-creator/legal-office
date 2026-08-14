"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsultationResponseUpload({
  consultationId,
  existingUrl,
  existingName,
}: {
  consultationId: string;
  existingUrl: string | null;
  existingName: string | null;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/consultation-requests/${consultationId}/response`, {
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
    <div>
      {existingUrl && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-primary-700 hover:underline bg-primary-50 rounded-lg px-3 py-2 mb-3"
        >
          📄 {existingName} (الملف الحالي)
        </a>
      )}
      <label className="text-sm text-primary-700 font-medium hover:underline cursor-pointer bg-white border border-gray-300 rounded-lg px-4 py-2 inline-block">
        {uploading ? "جاري الرفع..." : existingUrl ? "استبدال الملف" : "📎 رفع رد الاستشارة"}
        <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
