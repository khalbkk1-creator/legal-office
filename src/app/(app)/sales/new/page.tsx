"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; name: string };
type CaseItem = { id: string; title: string; caseNumber: string; clientId: string };

export default function NewSalePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    caseId: "",
    description: "",
    amount: "",
    applyVat: true,
    saleDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
    fetch("/api/cases").then((r) => r.json()).then(setCases);
  }, []);

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const amountNum = Number(form.amount) || 0;
  const vat = form.applyVat ? Math.round(amountNum * 0.15 * 100) / 100 : 0;
  const total = amountNum + vat;

  const relevantCases = form.clientId ? cases.filter((c) => c.clientId === form.clientId) : cases;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.clientId,
        caseId: form.caseId || undefined,
        description: form.description,
        amount: amountNum,
        applyVat: form.applyVat,
        saleDate: form.saleDate,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("تعذر إنشاء الفاتورة، تحقق من الحقول المطلوبة.");
      return;
    }
    router.push("/sales");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-ink mb-6">فاتورة جديدة</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">القضية (اختياري)</label>
          <select
            value={form.caseId}
            onChange={(e) => update("caseId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">بدون ربط بقضية</option>
            {relevantCases.map((c) => (
              <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وصف الخدمة *</label>
          <input
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="مثال: أتعاب استشارة قانونية"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ر.س) *</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
            <input
              type="date"
              value={form.saleDate}
              onChange={(e) => update("saleDate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.applyVat}
            onChange={(e) => update("applyVat", e.target.checked)}
            className="rounded border-gray-300"
          />
          تطبيق ضريبة القيمة المضافة (15%)
        </label>

        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">المبلغ قبل الضريبة</span>
            <span className="text-ink">{amountNum.toLocaleString()} ر.س</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">الضريبة</span>
            <span className="text-ink">{vat.toLocaleString()} ر.س</span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
            <span className="text-ink">الإجمالي</span>
            <span className="text-primary-700">{total.toLocaleString()} ر.س</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
        </button>
      </form>
    </div>
  );
}
