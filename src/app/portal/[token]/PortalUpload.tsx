"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalUpload({ token, caseId }: { token: string; caseId: string }) {
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

    const res = await fetch(`/api/portal/${token}/cases/${caseId}/documents`, {
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
    <div className="mt-2">
      <label className="text-xs text-primary-700 font-medium hover:underline cursor-pointer bg-primary-50 rounded-lg px-2 py-1 inline-block">
        {uploading ? "جاري الرفع..." : "+ إرفاق مستند"}
        <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
