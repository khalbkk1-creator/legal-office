"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CONSULTATION_TYPES = [
  { value: "PHONE", label: "📞 استشارة هاتفية" },
  { value: "IN_PERSON", label: "🏢 استشارة حضورية" },
  { value: "WRITTEN", label: "✍️ استشارة كتابية" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [officeName, setOfficeName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [rates, setRates] = useState<{ PHONE: number; IN_PERSON: number; WRITTEN: number }>({
    PHONE: 0,
    IN_PERSON: 0,
    WRITTEN: 0,
  });
  const [availability, setAvailability] = useState<{ days: number[]; startTime: string; endTime: string }>({
    days: [0, 1, 2, 3, 4],
    startTime: "09:00",
    endTime: "17:00",
  });
  const [form, setForm] = useState({
    name: "",
    phone: "",
    idNumber: "",
    email: "",
    notes: "",
    requestType: "CONSULTATION",
    consultationType: "PHONE",
    date: "",
    time: "",
    durationHours: "1",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/office-public-info")
      .then((r) => r.json())
      .then((d) => {
        setOfficeName(d.officeName || "");
        setLogoUrl(d.logoUrl || "");
        setRates({
          PHONE: d.phoneConsultationRate || 0,
          IN_PERSON: d.inPersonConsultationRate || 0,
          WRITTEN: d.writtenConsultationRate || 0,
        });
        setAvailability({
          days: Array.isArray(d.consultationDays) ? d.consultationDays : [0, 1, 2, 3, 4],
          startTime: d.consultationStartTime || "09:00",
          endTime: d.consultationEndTime || "17:00",
        });
      })
      .catch(() => {});
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dateInvalid =
    form.date && !availability.days.includes(new Date(form.date + "T00:00:00").getDay());

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

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        requestedDate: form.requestType === "CONSULTATION" && form.date && form.time ? `${form.date}T${form.time}` : undefined,
        durationMinutes: form.requestType === "CONSULTATION" ? Math.round(Number(form.durationHours) * 60) : undefined,
        estimatedCost: form.requestType === "CONSULTATION" ? estimatedCost : undefined,
      }),
    });

    if (!res.ok) {
      setLoading(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إتمام التسجيل");
      return;
    }

    const data = await res.json();
    router.push(`/portal/${data.portalToken}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4" dir="rtl">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="w-12 h-12 object-contain" />
          )}
          <div>
            {officeName && <p className="font-bold text-ink">{officeName}</p>}
            <p className="text-xs text-gray-400">تسجيل عميل جديد</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h1 className="text-lg font-bold text-ink">سجّل بياناتك</h1>
          <p className="text-xs text-gray-400">
            بعد التسجيل راح توديك مباشرة لصفحتك الخاصة، وتقدر تحفظ رابطها للرجوع لها لاحقاً.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع الطلب *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => update("requestType", "CONSULTATION")}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                  form.requestType === "CONSULTATION"
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                استشارة
              </button>
              <button
                type="button"
                onClick={() => update("requestType", "CASE")}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                  form.requestType === "CASE"
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                قضية
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال *</label>
            <input
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهوية *</label>
            <input
              required
              value={form.idNumber}
              onChange={(e) => update("idNumber", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              dir="ltr"
            />
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
                        form.consultationType === t.value
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      <span>{t.label}</span>
                      <span className="text-xs text-gray-400">
                        {rates[t.value as keyof typeof rates] > 0
                          ? `${rates[t.value as keyof typeof rates].toLocaleString()} ر.س/ساعة`
                          : ""}
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

              <p className="text-xs text-gray-400 -mt-2">
                المكتب يستقبل الحجوزات: {availability.days.map((d) => dayNames[d]).join("، ")} — من {availability.startTime} إلى {availability.endTime}
              </p>
              {dateInvalid && (
                <p className="text-xs text-red-600 -mt-2">هذا اليوم غير متاح للحجز، اختر يوماً آخر من الأيام المذكورة أعلاه.</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المدة المطلوبة (ساعات) *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.requestType === "CONSULTATION" ? "شرح تفاصيل الاستشارة *" : "شرح تفاصيل القضية *"}
            </label>
            <textarea
              required
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              placeholder="اكتب شرحاً واضحاً لطلبك حتى نقدر نراجعه بدقة..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "جاري التسجيل..." : "تسجيل والانتقال لصفحتي"}
          </button>
        </form>
      </div>
    </div>
  );
}
