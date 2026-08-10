"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddHearingForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [court, setCourt] = useState("");
  const [roundNumber, setRoundNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [appealDeadline, setAppealDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/cases/${caseId}/hearings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, court, roundNumber, notes, appealDeadline }),
    });
    setLoading(false);
    setOpen(false);
    setDate("");
    setCourt("");
    setRoundNumber("");
    setNotes("");
    setAppealDeadline("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-primary-700 font-medium hover:underline"
      >
        + إضافة جلسة
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
      <input
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="المحكمة"
        value={court}
        onChange={(e) => setCourt(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="رقم الجلسة"
        type="number"
        value={roundNumber}
        onChange={(e) => setRoundNumber(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="ملاحظات"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 mb-1">آخر موعد للاستئناف (اختياري)</label>
        <input
          type="date"
          value={appealDeadline}
          onChange={(e) => setAppealDeadline(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="col-span-2 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "جاري الحفظ..." : "حفظ"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-gray-500 px-4 py-2"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
