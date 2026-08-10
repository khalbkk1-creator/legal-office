"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CaseActions({
  caseId,
  status,
  userRole,
}: {
  caseId: string;
  status: string;
  userRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAction(action: string) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/cases/${caseId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر تنفيذ الإجراء");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("متأكد تبي تحذف هذه القضية نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    setLoading(true);
    const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر حذف القضية");
      return;
    }
    router.push("/cases");
    router.refresh();
  }

  const buttons: { label: string; action: string; style: string }[] = [];

  if (status === "UNDER_REVIEW") {
    buttons.push({ label: "إرسال للاعتماد", action: "SEND_FOR_APPROVAL", style: "bg-primary-700 hover:bg-primary-800 text-white" });
  }
  if (status === "UNDER_APPROVAL" && userRole === "PARTNER") {
    buttons.push({ label: "اعتماد القضية", action: "APPROVE", style: "bg-primary-700 hover:bg-primary-800 text-white" });
  }
  if (status === "ACTIVE") {
    buttons.push({ label: "إغلاق القضية", action: "CLOSE", style: "bg-gray-700 hover:bg-gray-800 text-white" });
  }
  if (status !== "ON_HOLD" && status !== "CLOSED") {
    buttons.push({ label: "تعليق القضية", action: "HOLD", style: "bg-amber-100 hover:bg-amber-200 text-amber-800" });
  }
  if (status === "ON_HOLD") {
    buttons.push({ label: "استرجاع الحالة السابقة", action: "RESTORE", style: "bg-primary-700 hover:bg-primary-800 text-white" });
  }

  if (buttons.length === 0 && userRole !== "PARTNER") return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-4">إجراءات القضية</h2>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <button
            key={b.action}
            onClick={() => runAction(b.action)}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${b.style}`}
          >
            {b.label}
          </button>
        ))}
        {userRole === "PARTNER" && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-60 mr-auto"
          >
            حذف القضية
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
    </div>
  );
}
