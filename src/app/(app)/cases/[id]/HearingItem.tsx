"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HearingReport from "./HearingReport";

type Hearing = {
  id: string;
  date: string;
  court: string | null;
  roundNumber: number | null;
  notes: string | null;
  outcome: string | null;
  isFinalRuling: boolean;
  reportUrl: string | null;
  reportName: string | null;
};

export default function HearingItem({
  caseId,
  hearing,
  defaultCourt,
}: {
  caseId: string;
  hearing: Hearing;
  defaultCourt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    date: hearing.date.slice(0, 10),
    court: hearing.court ?? "",
    roundNumber: hearing.roundNumber?.toString() ?? "",
    notes: hearing.notes ?? "",
    outcome: hearing.outcome ?? "",
    isFinalRuling: hearing.isFinalRuling,
  });

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/cases/${caseId}/hearings/${hearing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) {
      setError("تعذر حفظ التعديلات");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-right"
      >
        <div>
          <p className="text-sm font-medium text-ink">
            {hearing.roundNumber ? `الجلسة رقم ${hearing.roundNumber}` : "جلسة"} — {hearing.court ?? defaultCourt ?? "—"}
          </p>
          {hearing.notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{hearing.notes}</p>}
        </div>
        <p className="text-sm text-primary-700 font-medium whitespace-nowrap shrink-0 mr-3">
          {new Date(hearing.date).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </button>

      <HearingReport
        caseId={caseId}
        hearingId={hearing.id}
        hearingDate={hearing.date}
        reportUrl={hearing.reportUrl}
        reportName={hearing.reportName}
      />

      {open && (
        <form onSubmit={handleSave} className="mt-3 bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">التاريخ</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">رقم الجلسة</label>
              <input
                type="number"
                value={form.roundNumber}
                onChange={(e) => update("roundNumber", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">المحكمة</label>
            <input
              value={form.court}
              onChange={(e) => update("court", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">الملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">نتيجة الجلسة</label>
            <textarea
              value={form.outcome}
              onChange={(e) => update("outcome", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 bg-amber-50 rounded-lg p-3">
            <input
              type="checkbox"
              checked={form.isFinalRuling}
              onChange={(e) => update("isFinalRuling", e.target.checked)}
              className="mt-0.5"
            />
            <span>
              هذا حكم نهائي — احسب موعد الاستئناف تلقائياً عند الحفظ
              <span className="block text-xs text-gray-400 mt-0.5">
                (حسب تصنيف القضية: {form.date && "10 أيام لقضايا التنفيذ/المستعجلة، 30 يوم لباقي القضايا"})
              </span>
            </span>
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-gray-500 px-4 py-2"
            >
              إغلاق
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
