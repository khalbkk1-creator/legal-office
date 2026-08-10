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
      setError(data.error || "\u062a\u0639\u0630\u0631 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641");
      return;
    }
    load();
  }

  async function handleDelete(docId: string) {
    if (!confirm("\u0645\u062a\u0623\u0643\u062f \u062a\u0628\u064a \u062a\u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641\u061f")) return;
    await fetch(`/api/cases/${caseId}/documents/${docId}`, { method: "DELETE" });
    load();
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} \u0643\u064a\u0644\u0648\u0628\u0627\u064a\u062a`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} \u0645\u064a\u062c\u0627\u0628\u0627\u064a\u062a`;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-4">{"\u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a"}</h2>

      {loading ? (
        <p className="text-sm text-gray-400">{"\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644..."}</p>
      ) : (
        <div className="space-y-2 mb-4">
          {docs.length === 0 && <p className="text-sm text-gray-400">{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0631\u0641\u0642\u0627\u062a \u0644\u0647\u0630\u0647 \u0627\u0644\u0642\u0636\u064a\u0629."}</p>}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
              
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary-700 hover:underline min-w-0"
              >
                <span>{"[\u0645\u0644\u0641]"}</span>
                <span className="truncate">{d.fileName}</span>
              </a>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-400">{formatSize(d.fileSize)}</span>
                <button onClick={() => handleDelete(d.id)} className="text-xs text-red-600 hover:underline">
                  {"\u062d\u0630\u0641"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

      <label className="inline-block cursor-pointer text-sm text-primary-700 font-medium hover:underline">
        {uploading ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0631\u0641\u0639..." : "+ \u0625\u0631\u0641\u0627\u0642 \u0645\u0644\u0641"}
        <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>
      <p className="text-xs text-gray-400 mt-1">{"\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u062d\u062c\u0645 \u0627\u0644\u0645\u0644\u0641 10 \u0645\u064a\u062c\u0627\u0628\u0627\u064a\u062a"}</p>
    </div>
  );
}
