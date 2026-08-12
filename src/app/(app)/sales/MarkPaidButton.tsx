"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkPaidButton({ saleId, totalAmount }: { saleId: string; totalAmount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markPaid() {
    setLoading(true);
    await fetch(`/api/sales/${saleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PAID", paidAmount: totalAmount }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={markPaid}
      disabled={loading}
      className="text-xs text-primary-700 hover:underline disabled:opacity-60"
    >
      {loading ? "..." : "تحديد كمدفوعة"}
    </button>
  );
}
