"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewClientPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "INDIVIDUAL",
    idNumber: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      setError("تعذر إنشاء العميل، تحقق من الحقول المطلوبة.");
      return;
    }
    const created = await res.json();
    router.push(`/clients/${created.id}`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink mb-6">عميل جديد</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع العميل</label>
          <select
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="INDIVIDUAL">فرد</option>
            <option value="COMPANY">شركة</option>
          </select>
        </div>

        <Field label="الاسم" required value={form.name} onChange={(v) => update("name", v)} />
        <Field label="رقم الهوية / السجل التجاري" value={form.idNumber} onChange={(v) => update("idNumber", v)} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="الجوال" value={form.phone} onChange={(v) => update("phone", v)} />
          <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => update("email", v)} />
        </div>

        <Field label="العنوان" value={form.address} onChange={(v) => update("address", v)} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "جاري الحفظ..." : "حفظ العميل"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && "*"}
      </label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
