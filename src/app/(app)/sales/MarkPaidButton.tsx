"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = { id: string; code: string; name: string };

export default function MarkPaidButton({ saleId, totalAmount }: { saleId: string; totalAmount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/accounting/accounts")
      .then((r) => r.json())
      .then((data: Account[]) => {
        const liquid = data.filter((a) => a.code.startsWith("10") && a.code !== "1100");
        setAccounts(liquid);
        const cash = liquid.find((a) => a.code === "1010");
        setAccountId(cash?.id ?? liquid[0]?.id ?? "");
      })
      .catch(() => {});
  }, [open]);

  async function markPaid() {
    setLoading(true);
    await fetch(`/api/sales/${saleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PAID", paidAmount: totalAmount, paymentAccountId: accountId || undefined }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-primary-700 hover:underline">
        تحديد كمدفوعة
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="text-xs rounded-lg border border-gray-300 px-1.5 py-1"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <button onClick={markPaid} disabled={loading} className="text-xs text-primary-700 font-medium hover:underline disabled:opacity-60">
        {loading ? "..." : "تأكيد"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
    </div>
  );
}
