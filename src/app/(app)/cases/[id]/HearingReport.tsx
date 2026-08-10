"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HearingReport({
  caseId,
  hearingId,
  hearingDate,
  reportUrl,
  reportName,
}: {
  caseId: string;
  hearingId: string;
  hearingDate: string;
  reportUrl: string | null;
  reportName: string | null;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const isPast = new Date(hearingDate).getTime() < Date.now();
  if (!isPast) return null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/cases/${caseId}/hearings/${hearingId}/report`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    e.target.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر رفع التقرير");
      return;
    }
    router.refresh();
  }

  if (reportUrl) {
    return (
      <a
        href={reportUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary-700 hover:underline flex items-center gap-1 mt-1"
      >
        📄 {reportName || "تقرير الجلسة"}
      </a>
    );
  }

  return (
    <div className="mt-1">
      <label className="text-xs text-primary-700 font-medium hover:underline cursor-pointer">
        {uploading ? "جاري رفع التقرير..." : "+ إرفاق تقرير الجلسة"}
        <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
