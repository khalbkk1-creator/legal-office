"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuoteActions({
  quoteId,
  status,
  converted,
}: {
  quoteId: string;
  status: string;
  converted: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function convert() {
    if (!confirm("تحويل عرض السعر هذا إلى فاتورة فعلية؟")) return;
    setLoading(true);
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CONVERT_TO_SALE" }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  async function reject() {
    setLoading(true);
    await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    setLoading(false);
    router.refresh();
  }

  if (converted) {
    return <span className="text-xs text-gray-400">تم التحويل ✓</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={convert}
        disabled={loading}
        className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {loading ? "..." : "← تحويل لفاتورة"}
      </button>
      {status === "PENDING" && (
        <button onClick={reject} disabled={loading} className="text-xs text-red-600 hover:underline disabled:opacity-60">
          رفض
        </button>
      )}
    </div>
  );
}
