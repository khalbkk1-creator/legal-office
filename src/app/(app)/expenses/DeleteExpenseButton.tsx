"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("متأكد تبي تحذف هذا المصروف؟")) return;
    setLoading(true);
    await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-xs text-red-600 hover:underline disabled:opacity-60">
      {loading ? "..." : "حذف"}
    </button>
  );
}
