"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; name: string };
type Lawyer = { id: string; name: string; role: string };

export default function NewCasePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    caseNumber: "",
    title: "",
    caseType: "",
    court: "",
    opposingParty: "",
    claimValue: "",
    description: "",
    clientId: "",
    lawyerId: "",
  });

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
    fetch("/api/users").then((r) => r.json()).then(setLawyers);
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        claimValue: form.claimValue ? Number(form.claimValue) : undefined,
        lawyerId: form.lawyerId || undefined,
        court: form.court || undefined,
        opposingParty: form.opposingParty || undefined,
        description: form.description || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("تعذر إنشاء القضية، تحقق من الحقول المطلوبة.");
      return;
    }
    const created = await res.json();
    router.push(`/cases/${created.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink mb-6">قضية جديدة</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required value={form.caseNumber} onChange={(v) => update("caseNumber", v)} placeholder="C-2026-003" />
          <Field label="نوع القضية" required value={form.caseType} onChange={(v) => update("caseType", v)} placeholder="تجارية / عمالية / عقارية" />
        </div>

        <Field label="موضوع القضية" required value={form.title} onChange={(v) => update("title", v)} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العميل *</label>
            <select
              required
              value={form.clientId}
              onChange={(e) => update("clientId", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">اختر العميل</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المحامي المسؤول</label>
            <select
              value={form.lawyerId}
              onChange={(e) => update("lawyerId", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">بدون تعيين</option>
              {lawyers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="المحكمة" value={form.court} onChange={(v) => update("court", v)} />
          <Field label="الطرف الآخر" value={form.opposingParty} onChange={(v) => update("opposingParty", v)} />
        </div>

        <Field label="قيمة المطالبة (ر.س)" type="number" value={form.claimValue} onChange={(v) => update("claimValue", v)} />

        <p className="text-xs text-gray-400">
          ستبدأ القضية بحالة "تحت الدراسة" تلقائياً، وتقدر تنقلها لاحقاً عبر أزرار الإجراءات في صفحة القضية.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وصف القضية</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "جاري الحفظ..." : "حفظ القضية"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && "*"}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
