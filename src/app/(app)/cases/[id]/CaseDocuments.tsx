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

  async
