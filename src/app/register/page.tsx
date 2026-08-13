"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [officeName, setOfficeName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/office-public-info")
      .then((r) => r.json())
      .then((d) => {
        setOfficeName(d.officeName || "");
        setLogoUrl(d.logoUrl || "");
      })
      .catch(() => {});
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
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
            className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "جاري التسجيل..." : "تسجيل والانتقال لصفحتي"}
          </button>
        </form>
      </div>
    </div>
  );
}
