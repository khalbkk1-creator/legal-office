"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };
type CaseItem = { id: string; title: string; caseNumber: string };

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    categoryId: "",
    caseId: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetch("/api/expense-categories").then((r) => r.json()).then(setCategories);
    fetch("/api/cases").then((r) => r.json()).then(setCases);
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    const res = await fetch("/api/expense-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const created = await res.json();
    setCategories((c) => [...c, created]);
    setForm((f) => ({ ...f, categoryId: created.id }));
    setNewCategoryName("");
    setAddingCategory(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        amount: Number(form.amount),
        categoryId: form.categoryId || undefined,
        caseId: form.caseId || undefined,
        expenseDate: form.expenseDate,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("تعذر حفظ المصروف، تحقق من الحقول المطلوبة.");
      return;
    }
    router.push("/expenses");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-ink mb-6">مصروف جديد</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الوصف *</label>
          <input
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="مثال: فاتورة كهرباء المكتب"
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
              value={form.expenseDate}
              onChange={(e) => update("expenseDate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
          <select
            value={form.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
          >
            <option value="">بدون تصنيف</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="أو أضف تصنيف جديد"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={addCategory}
              disabled={addingCategory}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-1.5 disabled:opacity-60"
            >
              + إضافة
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">القضية (اختياري)</label>
          <select
            value={form.caseId}
            onChange={(e) => update("caseId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">بدون ربط بقضية</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "جاري الحفظ..." : "حفظ المصروف"}
        </button>
      </form>
    </div>
  );
}
