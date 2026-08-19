"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CONSULTATION_TYPES = [
  { value: "PHONE", label: "📞 استشارة هاتفية" },
  { value: "IN_PERSON", label: "🏢 استشارة حضورية" },
  { value: "WRITTEN", label: "✍️ استشارة كتابية" },
];

export default function NewRequestForm({
  token,
  rates,
  availability,
}: {
  token: string;
  rates: { PHONE: number; IN_PERSON: number; WRITTEN: number };
  availability: { days: number[]; startTime: string; endTime: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    requestType: "CONSULTATION",
    consultationType: "PHONE",
    date: "",
    time: "",
    durationHours: "1",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dateInvalid = form.date && !availability.days.includes(new Date(form.date + "T00:00:00").getDay());

  const timeOptions: string[] = [];
  {
    const [sh, sm] = availability.startTime.split(":").map(Number);
    const [eh, em] = availability.endTime.split(":").map(Number);
    let cur = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    while (cur < end) {
      const h = Math.floor(cur / 60).toString().padStart(2, "0");
      const m = (cur % 60).toString().padStart(2, "0");
      timeOptions.push(`${h}:${m}`);
      cur += 30;
    }
  }

  const selectedRate = rates[form.consultationType as keyof typeof rates] || 0;
  const estimatedCost = selectedRate * (Number(form.durationHours) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.requestType === "CONSULTATION" && dateInvalid) {
      setError(`المكتب يستقبل حجوزات الاستشارة أيام: ${availability.days.map((d) => dayNames[d]).join("، ")} فقط`);
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch(`/api/portal/${token}/service-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: form.requestType,
        notes: form.notes,
        consultationType: form.requestType === "CONSULTATION" ? form.consultationType : undefined,
        requestedDate: form.requestType === "CONSULTATION" && form.date && form.time ? `${form.date}T${form.time}` : undefined,
        durationMinutes: form.requestType === "CONSULTATION" ? Math.round(Number(form.durationHours) * 60) : undefined,
        estimatedCost: form.requestType === "CONSULTATION" ? estimatedCost : undefined,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إرسال الطلب");
      return;
    }
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      setDone(false);
      setForm({ requestType: "CONSULTATION", consultationType: "PHONE", date: "", time: "", durationHours: "1", notes: "" });
      router.refresh();
    }, 1200);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white border-2 border-dashed border-primary-200 hover:border-primary-400 text-primary-700 rounded-2xl p-4 text-sm font-medium transition"
      >
        + تقديم طلب جديد (قضية أو استشارة منفصلة)
      </button>
    );
  }

  if (done) {
    return (
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-6 text-center text-sm text-primary-800">
        ✅ تم إرسال طلبك بنجاح، وراح يظهر أدناه بعد المراجعة.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ink">طلب جديد</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => update("requestType", "CONSULTATION")}
          className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
            form.requestType === "CONSULTATION" ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-300 text-gray-600"
          }`}
        >
          استشارة
        </button>
        <button
          type="button"
          onClick={() => update("requestType", "CASE")}
          className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
            form.requestType === "CASE" ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-300 text-gray-600"
          }`}
        >
          قضية
        </button>
      </div>

      {form.requestType === "CONSULTATION" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع الاستشارة *</label>
            <div className="grid grid-cols-1 gap-2">
              {CONSULTATION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("consultationType", t.value)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    form.consultationType === t.value ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-300 text-gray-600"
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="text-xs text-gray-400">
                    {rates[t.value as keyof typeof rates] > 0 ? `${rates[t.value as keyof typeof rates].toLocaleString()} ر.س/ساعة` : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ المناسب *</label>
              <input
                required
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الوقت المناسب *</label>
              <select
                required
                value={form.time}
                onChange={(e) => update("time", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">اختر وقتاً</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          {dateInvalid && (
            <p className="text-xs text-red-600 -mt-2">هذا اليوم غير متاح، اختر من: {availability.days.map((d) => dayNames[d]).join("، ")}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المدة (ساعات) *</label>
            <input
              required
              type="number"
              min="0.5"
              step="0.5"
              value={form.durationHours}
              onChange={(e) => update("durationHours", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {selectedRate > 0 && (
            <div className="bg-primary-50 rounded-lg p-3 text-sm flex justify-between items-center">
              <span className="text-primary-800">التكلفة التقديرية</span>
              <span className="font-bold text-primary-700">{estimatedCost.toLocaleString()} ر.س</span>
            </div>
          )}
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">شرح تفاصيل الطلب *</label>
        <textarea
          required
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          placeholder="اكتب شرحاً واضحاً لطلبك..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {loading ? "جاري الإرسال..." : "إرسال الطلب"}
      </button>
    </form>
  );
}
