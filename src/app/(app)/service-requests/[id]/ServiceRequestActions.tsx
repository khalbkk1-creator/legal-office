"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };
type Doc = { id: string; fileName: string; fileUrl: string; category: { name: string } | null };
type Quote = { id: string; quoteNumber: string; totalAmount: number; status: string } | null;

export default function ServiceRequestActions({
  requestId,
  requestType,
  status,
  requestedCategoryIds,
  categories,
  documents,
  quotation,
}: {
  requestId: string;
  requestType: string;
  status: string;
  requestedCategoryIds: string[];
  categories: Category[];
  documents: Doc[];
  quotation: Quote;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(requestedCategoryIds);
  const [savingCategories, setSavingCategories] = useState(false);

  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteApplyVat, setQuoteApplyVat] = useState(true);
  const [sendingQuote, setSendingQuote] = useState(false);

  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [convertResult, setConvertResult] = useState<{ destination: string; destinationId: string } | null>(null);

  function toggleCategory(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function saveCategories() {
    setSavingCategories(true);
    await fetch(`/api/service-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedCategoryIds: selected }),
    });
    setSavingCategories(false);
    router.refresh();
  }

  async function sendQuote(e: React.FormEvent) {
    e.preventDefault();
    setSendingQuote(true);
    setError("");
    const res = await fetch(`/api/service-requests/${requestId}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: quoteDescription,
        amount: Number(quoteAmount),
        applyVat: quoteApplyVat,
      }),
    });
    setSendingQuote(false);
    if (!res.ok) {
      setError("تعذر إرسال عرض السعر");
      return;
    }
    router.refresh();
  }

  async function convert() {
    setConverting(true);
    setError("");
    const res = await fetch(`/api/service-requests/${requestId}/convert`, { method: "POST" });
    setConverting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر تحويل الطلب");
      return;
    }
    const data = await res.json();
    setConvertResult(data);
    router.refresh();
  }

  const quoteAccepted = quotation?.status === "ACCEPTED";
  const showConvert = quoteAccepted && status !== "CONVERTED";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-3">طلب مستندات من العميل</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={`text-xs rounded-lg px-3 py-1.5 border transition ${
                selected.includes(c.id)
                  ? "bg-primary-700 border-primary-700 text-white"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <button
          onClick={saveCategories}
          disabled={savingCategories}
          className="text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {savingCategories ? "جاري الحفظ..." : "إرسال طلب المستندات للعميل"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-3">المستندات المرفوعة ({documents.length})</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">لم يرفع العميل أي مستندات بعد.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {documents.map((d) => (
              <a
                key={d.id}
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-700 hover:underline bg-primary-50 rounded-lg px-2 py-1"
              >
                📄 {d.fileName} {d.category ? `(${d.category.name})` : ""}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-3">عرض السعر</h2>
        {quotation ? (
          <div className="text-sm space-y-1">
            <p><span className="text-gray-400">رقم العرض:</span> {quotation.quoteNumber}</p>
            <p><span className="text-gray-400">المبلغ:</span> {quotation.totalAmount.toLocaleString()} ر.س</p>
            <p>
              <span className="text-gray-400">الحالة:</span>{" "}
              <span className={quoteAccepted ? "text-primary-700 font-medium" : "text-amber-600 font-medium"}>
                {quotation.status === "PENDING" ? "بانتظار رد العميل" : quotation.status === "ACCEPTED" ? "وافق العميل" : quotation.status === "REJECTED" ? "رفض العميل" : quotation.status}
              </span>
            </p>
          </div>
        ) : (
          <form onSubmit={sendQuote} className="space-y-3">
            <input
              required
              value={quoteDescription}
              onChange={(e) => setQuoteDescription(e.target.value)}
              placeholder="وصف الخدمة"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              placeholder="المبلغ (ر.س)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={quoteApplyVat} onChange={(e) => setQuoteApplyVat(e.target.checked)} />
              تطبيق ضريبة القيمة المضافة (15%)
            </label>
            <button
              type="submit"
              disabled={sendingQuote}
              className="text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60"
            >
              {sendingQuote ? "جاري الإرسال..." : "إرسال عرض السعر للعميل"}
            </button>
          </form>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {showConvert && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-6">
          <p className="text-sm text-primary-800 mb-3">
            وافق العميل على العرض! حوّل الطلب الآن إلى {requestType === "CASE" ? "قضية" : "استشارة"} مع كل مستنداته.
          </p>
          <button
            onClick={convert}
            disabled={converting}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {converting ? "جاري التحويل..." : `تحويل إلى ${requestType === "CASE" ? "قضية" : "استشارة"}`}
          </button>
        </div>
      )}

      {convertResult && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-6 text-sm text-primary-800">
          تم التحويل بنجاح! راجع الطلب من شاشة {convertResult.destination === "case" ? "القضايا" : "طلبات الاستشارة"}.
        </div>
      )}
    </div>
  );
}
