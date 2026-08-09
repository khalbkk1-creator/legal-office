"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "LAWYER", phone: "", password: "" });

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((users) => {
        const u = users.find((x: any) => x.id === id);
        if (u) setForm({ name: u.name, email: u.email, role: u.role, phone: u.phone ?? "", password: "" });
        setLoading(false);
      });
  }, [id]);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        role: form.role,
        phone: form.phone,
        password: form.password || undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر حفظ التعديلات");
      return;
    }
    router.push("/users");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("متأكد تبي تحذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذر حذف المستخدم");
      return;
    }
    router.push("/users");
    router.refresh();
  }

  if (loading) return <p className="text-gray-400 text-sm">جاري التحميل...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-ink mb-6">تعديل المستخدم</h1>
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
          <input
            value={form.email}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">لا يمكن تغيير البريد الإلكتروني حالياً</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الجوال</label>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
          <select
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="PARTNER">شريك</option>
            <option value="LAWYER">محامي</option>
            <option value="SECRETARY">سكرتير</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">كلمة مرور جديدة (اختياري)</label>
          <input
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="اتركها فارغة إذا ما تبي تغييرها"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="text-red-600 text-sm hover:underline"
          >
            حذف المستخدم
          </button>
        </div>
      </form>
    </div>
  );
}

