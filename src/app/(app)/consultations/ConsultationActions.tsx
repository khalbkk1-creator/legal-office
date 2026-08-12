"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsultationActions({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(newStatus: string) {
    setLoading(true);
    await fetch(`/api/consultation-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  if (status === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => setStatus("CONFIRMED")} disabled={loading} className="text-xs text-primary-700 hover:underline disabled:opacity-60">
          تأكيد
        </button>
        <button onClick={() => setStatus("CANCELLED")} disabled={loading} className="text-xs text-red-600 hover:underline disabled:opacity-60">
          إلغاء
        </button>
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <button onClick={() => setStatus("DONE")} disabled={loading} className="text-xs text-gray-600 hover:underline disabled:opacity-60">
        تحديد كمنتهية
      </button>
    );
  }

  return null;
}
