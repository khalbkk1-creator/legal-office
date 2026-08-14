"use client";

import { useState } from "react";

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
  const [facts, setFacts] = useState("");
  const [legalGrounds, setLegalGrounds] = useState("");
  const [requests, setRequests] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const payload = { templateType, facts, legalGrounds, requests };

  async function handleGenerate() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/cases/${caseId}/generate-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  function printPdf() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `/api/cases/${caseId}/generate-document-html`;
    form.target = "_blank";
    for (const [key, value] of Object.entries(payload)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-1">توليد مذكرة</h2>
      <p className="text-xs text-gray-400 mb-4">
        بيانات القضية (العميل، الطرف الآخر، رقم القضية، المحكمة) تُدمج تلقائياً بفقرة افتتاحية داخل نص المذكرة.
      </p>

      <div className="space-y-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">أولاً: الوقائع</label>
          <textarea
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            rows={4}
            placeholder={"اكتب وقائع القضية...\nابدأ السطر بـ - لإضافة نقطة"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ثانياً: الأسانيد القانونية</label>
          <textarea
            value={legalGrounds}
            onChange={(e) => setLegalGrounds(e.target.value)}
            rows={4}
            placeholder={"اكتب الأسانيد والحجج القانونية...\nابدأ السطر بـ - لإضافة نقطة"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ثالثاً: الطلبات</label>
          <textarea
            value={requests}
            onChange={(e) => setRequests(e.target.value)}
            rows={3}
            placeholder={"اكتب طلباتك للمحكمة...\nابدأ السطر بـ - لإضافة نقطة"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">💡 ابدأ أي سطر بـ "- " ليتحول تلقائياً لنقطة مرقّمة بالمستند.</p>
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
          <button
            onClick={printPdf}
            type="button"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            🖨️ عرض / طباعة PDF
          </button>
        </div>
      </div>
    </div>
  );
}
