"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProfileData = {
  name: string;
  type: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
};

const typeOptions = [
  { value: "INDIVIDUAL", label: "فرد" },
  { value: "COMPANY", label: "شركة" },
  { value: "GOVERNMENT", label: "جهة حكومية" },
];

export default function ProfileForm({ token, initial }: { token: string; initial: ProfileData }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field: keyof ProfileData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const res = await fetch(`/api/portal/${token}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر حفظ البيانات");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  const idLabel = form.type === "INDIVIDUAL" ? "رقم الهوية" : "رقم السجل التجاري / الرقم الموحّد";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">تصنيف العميل</label>
        <div className="grid grid-cols-3 gap-2">
          {typeOptions.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => update("type", opt.value)}
              className={`text-sm rounded-xl border px-3 py-2.5 transition ${
                form.type === opt.value
                  ? "border-primary-600 bg-primary-50 text-primary-700 font-medium"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {form.type === "INDIVIDUAL" ? "الاسم الكامل" : "اسم الجهة"}
        </label>
        <input
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{idLabel}</label>
        <input
          value={form.idNumber}
          onChange={(e) => update("idNumber", e.target.value)}
          dir="ltr"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
          <input
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            dir="ltr"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            dir="ltr"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (اختياري)</label>
        <textarea
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-primary-700 bg-primary-50 rounded-lg px-3 py-2">✅ تم حفظ بياناتك بنجاح.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-gradient-to-l from-primary-800 to-primary-600 hover:from-primary-900 hover:to-primary-700 text-white rounded-xl py-3 text-sm font-semibold shadow-elevated transition disabled:opacity-60"
      >
        {saving ? "جاري الحفظ..." : "حفظ البيانات"}
      </button>
    </form>
  );
}
