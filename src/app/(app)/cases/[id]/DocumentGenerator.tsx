"use client";

import { useRef, useState } from "react";

const DOCUMENT_TYPES = [
  { value: "RESPONSE_MEMO", label: "مذكرة جوابية" },
  { value: "OBJECTION_MEMO", label: "مذكرة اعتراضية" },
  { value: "RECONSIDERATION_MEMO", label: "مذكرة التماس إعادة نظر" },
  { value: "CASSATION_MEMO", label: "مذكرة نقض" },
  { value: "CLAIM_STATEMENT", label: "صحيفة الدعوى" },
  { value: "REPORT", label: "تقرير" },
  { value: "NOTICE", label: "إخطار" },
  { value: "LETTER", label: "خطاب رسمي" },
];

export default function DocumentGenerator({ caseId }: { caseId: string }) {
  const [templateType, setTemplateType] = useState("RESPONSE_MEMO");
  const [bodyText, setBodyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const printFormRef = useRef<HTMLFormElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);

  async function handleGenerate() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/cases/${caseId}/generate-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateType, bodyText }),
    });

    if (!res.ok) {
      setLoading(false);
      setError("تعذر توليد المستند");
      return;
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="(.+)"/);
    const filename = match ? decodeURIComponent(match[1]) : "document.docx";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-4">توليد مستند</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع المستند</label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نص المستند</label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={6}
            placeholder="اكتب محتوى المذكرة أو التقرير هنا..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            بيانات القضية (رقم القضية، العميل، المحكمة...) تنضاف تلقائياً بأعلى المستند.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "جاري التوليد..." : "📄 توليد وتنزيل Word"}
          </button>

          <form
            ref={printFormRef}
            action={`/api/cases/${caseId}/generate-document-html`}
            method="POST"
            target="_blank"
          >
            <input ref={templateInputRef} type="hidden" name="templateType" value={templateType} readOnly />
            <input ref={bodyInputRef} type="hidden" name="bodyText" value={bodyText} readOnly />
            <button
              type="submit"
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              🖨️ عرض / طباعة PDF
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
