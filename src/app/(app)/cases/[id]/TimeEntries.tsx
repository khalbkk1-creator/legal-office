"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Entry = {
  id: string;
  description: string;
  minutes: number;
  hourlyRate: number;
  billed: boolean;
  entryDate: string;
  lawyer: { name: string };
};

export default function TimeEntries({
  caseId,
  entries,
  defaultRate,
}: {
  caseId: string;
  entries: Entry[];
  defaultRate: number;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState(defaultRate ? defaultRate.toString() : "");
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState(false);
  const [error, setError] = useState("");

  const unbilled = entries.filter((e) => e.billed === false);
  const unbilledMinutes = unbilled.reduce((sum, e) => sum + e.minutes, 0);
  const unbilledAmount = unbilled.reduce((sum, e) => sum + (e.minutes / 60) * e.hourlyRate, 0);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/cases/${caseId}/time-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        minutes: Math.round(Number(hours) * 60),
        hourlyRate: Number(rate),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("تعذر حفظ القيد");
      return;
    }
    setDescription("");
    setHours("");
    router.refresh();
  }

  async function deleteEntry(id: string) {
    if (!confirm("حذف هذا القيد؟")) return;
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function generateInvoice() {
    if (!confirm(`تحويل ${unbilled.length} قيد (${unbilledAmount.toLocaleString()} ر.س) إلى فاتورة؟`)) return;
    setBilling(true);
    setError("");
    const res = await fetch(`/api/cases/${caseId}/time-entries/bill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applyVat: true }),
    });
    setBilling(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إنشاء الفاتورة");
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-4">الساعات القابلة للفوترة</h2>

      <div className="space-y-2 mb-4">
        {entries.length === 0 && <p className="text-sm text-gray-400">لا توجد ساعات مسجّلة بعد.</p>}
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-2 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm text-ink truncate">{e.description}</p>
              <p className="text-xs text-gray-400">
                {e.lawyer.name} · {(e.minutes / 60).toFixed(2)} ساعة × {e.hourlyRate.toLocaleString()} ر.س ·{" "}
                {new Date(e.entryDate).toLocaleDateString("ar-SA")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${e.billed ? "bg-primary-50 text-primary-700" : "bg-amber-50 text-amber-700"}`}>
                {e.billed ? "مفوتر" : "غير مفوتر"}
              </span>
              {!e.billed && (
                <button onClick={() => deleteEntry(e.id)} className="text-xs text-red-600 hover:underline">
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {unbilled.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-3 mb-4 flex items-center justify-between text-sm">
          <span className="text-amber-800">
            {unbilled.length} قيد غير مفوتر — {(unbilledMinutes / 60).toFixed(2)} ساعة — {unbilledAmount.toLocaleString()} ر.س
          </span>
          <button
            onClick={generateInvoice}
            disabled={billing}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
          >
            {billing ? "..." : "تحويل لفاتورة"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

      <form onSubmit={addEntry} className="grid grid-cols-4 gap-2">
        <input
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف العمل"
          className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          min="0"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="عدد الساعات"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="سعر الساعة"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="col-span-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : "+ إضافة قيد وقت"}
        </button>
      </form>
    </div>
  );
}
