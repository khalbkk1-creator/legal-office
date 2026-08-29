"use client";

import { useEffect, useState } from "react";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((data) => {
        setKeys(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إنشاء المفتاح");
      return;
    }
    const data = await res.json();
    setNewKey(data.key);
    setName("");
    load();
  }

  async function revokeKey(id: string) {
    if (!confirm("متأكد تبي تلغي هذا المفتاح؟ أي أداة تستخدمه بتتوقف عن العمل فوراً.")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">مفاتيح API الخارجية</h1>
        <p className="text-gray-500 text-sm mt-1">
          لربط النظام بأدوات خارجية مثل Zapier أو Make. أنشئ مفتاح، واستخدمه بترويسة{" "}
          <code dir="ltr" className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Authorization: Bearer &lt;المفتاح&gt;</code>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-3">
        <h2 className="font-bold text-ink text-sm">النقاط المتاحة حالياً</h2>
        <div className="space-y-1 text-sm text-gray-600">
          <p><code dir="ltr" className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">GET /api/v1/cases</code> — قائمة القضايا</p>
          <p><code dir="ltr" className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">GET /api/v1/invoices</code> — قائمة الفواتير</p>
        </div>
      </div>

      {newKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2">
          <p className="text-sm font-medium text-amber-800">⚠️ انسخ المفتاح الآن — ما راح يظهر مرة ثانية أبداً</p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs overflow-x-auto">{newKey}</code>
            <button
              onClick={() => navigator.clipboard.writeText(newKey)}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-2 shrink-0"
            >
              نسخ
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-amber-700 hover:underline">إخفاء</button>
        </div>
      )}

      <form onSubmit={createKey} className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم وصفي للمفتاح</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: Zapier - تنبيهات القضايا"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "جاري الإنشاء..." : "+ إنشاء مفتاح"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">الاسم</th>
              <th className="text-right px-5 py-3 font-medium">المفتاح</th>
              <th className="text-right px-5 py-3 font-medium">آخر استخدام</th>
              <th className="text-right px-5 py-3 font-medium">الحالة</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-ink">{k.name}</td>
                <td className="px-5 py-3 text-gray-500" dir="ltr">{k.keyPrefix}...</td>
                <td className="px-5 py-3 text-gray-500">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("ar-SA") : "لم يُستخدم بعد"}</td>
                <td className="px-5 py-3">
                  {k.isActive ? (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-primary-50 text-primary-700">فعّال</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">ملغى</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {k.isActive && (
                    <button onClick={() => revokeKey(k.id)} className="text-xs text-red-600 hover:underline">إلغاء</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && keys.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">لا توجد مفاتيح بعد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
