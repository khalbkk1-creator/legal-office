"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuoteResponse({ token, quoteId }: { token: string; quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function respond(action: "ACCEPT" | "REJECT") {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/portal/${token}/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("تعذر إرسال ردك، حاول مرة أخرى");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => respond("ACCEPT")}
          disabled={loading}
          className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 disabled:opacity-60"
        >
          موافقة
        </button>
        <button
          onClick={() => respond("REJECT")}
          disabled={loading}
          className="text-xs text-red-600 hover:underline disabled:opacity-60"
        >
          رفض
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
