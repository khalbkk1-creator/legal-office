"use client";

import { useEffect, useState } from "react";

type Settings = {
  id: string;
  officeName: string | null;
  logoUrl: string | null;
  letterheadUrl: string | null;
  taxNumber: string | null;
  phone: string | null;
  address: string | null;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    officeName: "",
    taxNumber: "",
    phone: "",
    address: "",
    defaultHourlyRate: "",
    phoneConsultationRate: "",
    inPersonConsultationRate: "",
    writtenConsultationRate: "",
    consultationStartTime: "",
    consultationEndTime: "",
  });
  const [consultationDays, setConsultationDays] = useState<number[]>([0, 1, 2, 3, 4]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setForm({
          officeName: data.officeName ?? "",
          taxNumber: data.taxNumber ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          defaultHourlyRate: data.defaultHourlyRate?.toString() ?? "",
          phoneConsultationRate: data.phoneConsultationRate?.toString() ?? "",
          inPersonConsultationRate: data.inPersonConsultationRate?.toString() ?? "",
          writtenConsultationRate: data.writtenConsultationRate?.toString() ?? "",
          consultationStartTime: data.consultationStartTime ?? "",
          consultationEndTime: data.consultationEndTime ?? "",
        });
        setConsultationDays(Array.isArray(data.consultationDays) ? data.consultationDays : [0, 1, 2, 3, 4]);
        setLoading(false);
      });
  }, []);

  function toggleDay(day: number) {
    setConsultationDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day].sort()));
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, consultationDays }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر حفظ الإعدادات");
      return;
    }
    setSuccess(true);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
    setUploadingLogo(false);
    e.target.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر رفع الشعار");
      return;
    }
    const updated = await res.json();
    setSettings(updated);
  }

  async function handleLetterheadUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLetterhead(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/settings/letterhead", { method: "POST", body: formData });
    setUploadingLetterhead(false);
    e.target.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر رفع ورق الشركة");
      return;
    }
    const updated = await res.json();
    setSettings(updated);
  }

  if (loading) return <p className="text-gray-400 text-sm">جاري التحميل...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-ink mb-6">إعدادات المكتب</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">شعار المكتب</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {settings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="شعار المكتب" className="w-full h-full object-contain" />
            ) : (
              <span className="text-gray-300 text-xs">بدون شعار</span>
            )}
          </div>
          <label className="text-sm text-primary-700 font-medium hover:underline cursor-pointer">
            {uploadingLogo ? "جاري الرفع..." : "رفع / تغيير الشعار"}
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">ورق الشركة (خلفية كاملة للمستندات)</label>
        <p className="text-xs text-gray-400 mb-3">
          ارفع تصميم ورق الشركة الجاهز (بالهيدر والفوتر)، وراح يستخدم كخلفية تلقائية للمستندات المولّدة بصيغة PDF للطباعة.
        </p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-20 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {settings?.letterheadUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.letterheadUrl} alt="ورق الشركة" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-300 text-xs">فارغ</span>
            )}
          </div>
          <label className="text-sm text-primary-700 font-medium hover:underline cursor-pointer">
            {uploadingLetterhead ? "جاري الرفع..." : "رفع / تغيير ورق الشركة"}
            <input type="file" accept="image/*" onChange={handleLetterheadUpload} disabled={uploadingLetterhead} className="hidden" />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المكتب</label>
          <input
            value={form.officeName}
            onChange={(e) => update("officeName", e.target.value)}
            placeholder="مثال: مكتب المحاماة والاستشارات القانونية"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الضريبي (إن وجد)</label>
          <input
            value={form.taxNumber}
            onChange={(e) => update("taxNumber", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال / الهاتف</label>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">سعر الساعة الافتراضي (ر.س)</label>
          <input
            type="number"
            min="0"
            value={form.defaultHourlyRate}
            onChange={(e) => update("defaultHourlyRate", e.target.value)}
            placeholder="مثال: 300"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">يُستخدم كقيمة مبدئية عند تسجيل الساعات القابلة للفوترة.</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-primary-700 bg-primary-50 rounded-lg px-3 py-2">تم حفظ الإعدادات بنجاح</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
        <h2 className="font-bold text-ink mb-1">تصنيف الاستشارات</h2>
        <p className="text-xs text-gray-400 mb-4">
          سعر الساعة لكل نوع استشارة — يُستخدم لحساب التكلفة تلقائياً بصفحة تسجيل العملاء.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📞 سعر ساعة الاستشارة الهاتفية (ر.س)</label>
            <input
              type="number"
              min="0"
              value={form.phoneConsultationRate}
              onChange={(e) => update("phoneConsultationRate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🏢 سعر ساعة الاستشارة الحضورية (ر.س)</label>
            <input
              type="number"
              min="0"
              value={form.inPersonConsultationRate}
              onChange={(e) => update("inPersonConsultationRate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">✍️ سعر ساعة الاستشارة الكتابية (ر.س)</label>
            <input
              type="number"
              min="0"
              value={form.writtenConsultationRate}
              onChange={(e) => update("writtenConsultationRate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">أيام استقبال حجوزات الاستشارة</label>
            <div className="flex flex-wrap gap-2">
              {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`text-xs rounded-lg px-3 py-1.5 border transition ${
                    consultationDays.includes(i)
                      ? "bg-primary-700 border-primary-700 text-white"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من الساعة</label>
              <input
                type="time"
                value={form.consultationStartTime}
                onChange={(e) => update("consultationStartTime", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى الساعة</label>
              <input
                type="time"
                value={form.consultationEndTime}
                onChange={(e) => update("consultationEndTime", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">هذي الأوقات هي اللي تظهر للعميل عند حجز الاستشارة من صفحة التسجيل.</p>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ أسعار الاستشارات"}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        هذه البيانات تظهر تلقائياً بأعلى كل فاتورة وعرض سعر عند الطباعة.
      </p>
    </div>
  );
}
