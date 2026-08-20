"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const typeLabels: Record<string, string> = {
  ASSET: "أصول",
  LIABILITY: "التزامات",
  EQUITY: "حقوق ملكية",
  REVENUE: "إيرادات",
  EXPENSE: "مصروفات",
};

const typeColors: Record<string, string> = {
  ASSET: "bg-blue-50 text-blue-700",
  LIABILITY: "bg-amber-50 text-amber-700",
  EQUITY: "bg-purple-50 text-purple-700",
  REVENUE: "bg-primary-50 text-primary-700",
  EXPENSE: "bg-red-50 text-red-600",
};

const sourceLabels: Record<string, string> = {
  SALE: "فاتورة",
  EXPENSE: "مصروف",
  PAYMENT: "تحصيل دفعة",
  MANUAL: "قيد يدوي",
  REVERSAL: "عكس قيد",
};

type Account = { id: string; code: string; name: string; type: string; isSystem: boolean; isActive: boolean; parentId: string | null };
type JournalLine = { id: string; debit: number; credit: number; description: string | null; account: Account };
type JournalEntry = {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceType: string | null;
  createdBy: { name: string } | null;
  lines: JournalLine[];
  reversalOfId: string | null;
  reversedBy: { id: string; entryNumber: string } | null;
};
type TrialBalanceRow = { id: string; code: string; name: string; type: string; debit: number; credit: number; balance: number };

export default function AccountingScreen({
  accounts,
  entries,
  trialBalance,
}: {
  accounts: Account[];
  entries: JournalEntry[];
  trialBalance: TrialBalanceRow[];
}) {
  const [tab, setTab] = useState<"journal" | "accounts" | "trial">("journal");

  const totalDebit = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalCredit = trialBalance.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">النظام المحاسبي</h1>
        <p className="text-gray-500 text-sm mt-1">دليل الحسابات والقيود اليومية وميزان المراجعة</p>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setTab("journal")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "journal" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📒 القيود اليومية
        </button>
        <button
          onClick={() => setTab("accounts")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "accounts" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📚 دليل الحسابات
        </button>
        <button
          onClick={() => setTab("trial")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "trial" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ⚖️ ميزان المراجعة
        </button>
      </div>

      {tab === "journal" && <JournalTab entries={entries} accounts={accounts} />}

      {tab === "accounts" && <AccountsTab accounts={accounts} />}

      {tab === "trial" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-5 py-3 font-medium">الرقم</th>
                <th className="text-right px-5 py-3 font-medium">الحساب</th>
                <th className="text-right px-5 py-3 font-medium">النوع</th>
                <th className="text-right px-5 py-3 font-medium">مدين</th>
                <th className="text-right px-5 py-3 font-medium">دائن</th>
                <th className="text-right px-5 py-3 font-medium">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.map((r) => (
                <tr key={r.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 text-gray-500">{r.code}</td>
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/accounting/ledger/${r.id}`} className="text-primary-700 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeColors[r.type]}`}>{typeLabels[r.type]}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{r.debit.toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-600">{r.credit.toLocaleString()}</td>
                  <td className={`px-5 py-3 font-bold ${r.balance >= 0 ? "text-primary-700" : "text-red-600"}`}>
                    {r.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
              {trialBalance.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">لا توجد حركات مرحّلة بعد.</td>
                </tr>
              )}
            </tbody>
            {trialBalance.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td colSpan={3} className="px-5 py-3 text-ink">الإجمالي</td>
                  <td className="px-5 py-3 text-ink">{totalDebit.toLocaleString()}</td>
                  <td className="px-5 py-3 text-ink">{totalCredit.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {Math.round(totalDebit * 100) === Math.round(totalCredit * 100) ? (
                      <span className="text-primary-700">متوازن ✓</span>
                    ) : (
                      <span className="text-red-600">غير متوازن ✗</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function AccountsTab({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", type: "EXPENSE", parentId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/accounting/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, parentId: form.parentId || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إضافة الحساب");
      return;
    }
    setForm({ code: "", name: "", type: "EXPENSE", parentId: "" });
    setShowForm(false);
    router.refresh();
  }

  async function saveEdit(id: string) {
    await fetch(`/api/accounting/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    router.refresh();
  }

  async function toggleActive(a: Account) {
    await fetch(`/api/accounting/accounts/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    router.refresh();
  }

  async function deleteAccount(id: string) {
    if (!confirm("متأكد تبي تحذف هذا الحساب؟")) return;
    const res = await fetch(`/api/accounting/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذر حذف الحساب");
      return;
    }
    router.refresh();
  }

  const parentOptions = accounts.filter((a) => a.code.endsWith("000") || !a.parentId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          {showForm ? "إلغاء" : "+ حساب جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createAccount} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="رقم الحساب (مثال: 5200)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              dir="ltr"
            />
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="اسم الحساب"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">بدون حساب رئيسي</option>
              {parentOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ الحساب"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">الرقم</th>
              <th className="text-right px-5 py-3 font-medium">اسم الحساب</th>
              <th className="text-right px-5 py-3 font-medium">النوع</th>
              <th className="text-right px-5 py-3 font-medium">الحالة</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} className={`border-t border-gray-50 ${!a.isActive ? "opacity-50" : ""}`}>
                <td className="px-5 py-3 text-gray-500 font-mono">{a.code}</td>
                <td className={`px-5 py-3 ${a.code.endsWith("000") ? "font-bold text-ink" : "text-gray-700 pr-8"}`}>
                  {editingId === a.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                      <button onClick={() => saveEdit(a.id)} className="text-xs text-primary-700 hover:underline">حفظ</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
                    </div>
                  ) : a.code.endsWith("000") ? (
                    a.name
                  ) : (
                    <Link href={`/accounting/ledger/${a.id}`} className="text-primary-700 hover:underline">
                      {a.name}
                    </Link>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeColors[a.type]}`}>{typeLabels[a.type]}</span>
                </td>
                <td className="px-5 py-3">
                  {a.isActive ? (
                    <span className="text-xs text-primary-700">نشط</span>
                  ) : (
                    <span className="text-xs text-gray-400">معطّل</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {editingId !== a.id && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setEditingId(a.id); setEditName(a.name); }}
                        className="text-xs text-primary-700 hover:underline"
                      >
                        تعديل
                      </button>
                      <button onClick={() => toggleActive(a)} className="text-xs text-amber-600 hover:underline">
                        {a.isActive ? "تعطيل" : "تفعيل"}
                      </button>
                      {!a.isSystem && (
                        <button onClick={() => deleteAccount(a.id)} className="text-xs text-red-600 hover:underline">
                          حذف
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JournalTab({ entries, accounts }: { entries: JournalEntry[]; accounts: Account[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState([
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = lines.length >= 2 && totalDebit > 0 && Math.round(totalDebit * 100) === Math.round(totalCredit * 100);

  function updateLine(i: number, field: "accountId" | "debit" | "credit", value: string) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, { accountId: "", debit: "", credit: "" }]);
  }

  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  async function reverseEntry(id: string) {
    if (!confirm("متأكد تبي تعكس هذا القيد؟ راح يُنشأ قيد عكسي يلغي أثره.")) return;
    setReversingId(id);
    const res = await fetch(`/api/accounting/journal-entries/${id}/reverse`, { method: "POST" });
    setReversingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذر عكس القيد");
      return;
    }
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!balanced) {
      setError("القيد غير متوازن — مجموع المدين لازم يساوي مجموع الدائن");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/accounting/journal-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر ترحيل القيد");
      return;
    }
    setDescription("");
    setLines([{ accountId: "", debit: "", credit: "" }, { accountId: "", debit: "", credit: "" }]);
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          {showForm ? "إلغاء" : "+ قيد يدوي جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف القيد"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={l.accountId}
                  onChange={(e) => updateLine(i, "accountId", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">اختر حساب</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={l.debit}
                  onChange={(e) => updateLine(i, "debit", e.target.value)}
                  placeholder="مدين"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={l.credit}
                  onChange={(e) => updateLine(i, "credit", e.target.value)}
                  placeholder="دائن"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {lines.length > 2 && (
                  <button type="button" onClick={() => removeLine(i)} className="text-red-500 text-sm px-2">✕</button>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addLine} className="text-xs text-primary-700 hover:underline">
            + إضافة سطر
          </button>

          <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-3">
            <span>مدين: {totalDebit.toLocaleString()}</span>
            <span>دائن: {totalCredit.toLocaleString()}</span>
            <span className={balanced ? "text-primary-700 font-medium" : "text-red-600 font-medium"}>
              {balanced ? "متوازن ✓" : "غير متوازن"}
            </span>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={saving || !balanced}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "جاري الترحيل..." : "ترحيل القيد"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-ink">{e.entryNumber}</p>
                <p className="text-xs text-gray-400">{e.description}</p>
              </div>
              <div className="text-left">
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                  {e.sourceType ? sourceLabels[e.sourceType] ?? e.sourceType : "—"}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(e.date).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                </p>
                {e.reversedBy ? (
                  <p className="text-xs text-amber-600 mt-1">عُكس بالقيد {e.reversedBy.entryNumber}</p>
                ) : e.reversalOfId ? (
                  <p className="text-xs text-gray-400 mt-1">قيد عكسي</p>
                ) : (
                  <button
                    onClick={() => reverseEntry(e.id)}
                    disabled={reversingId === e.id}
                    className="text-xs text-red-600 hover:underline mt-1 disabled:opacity-60"
                  >
                    {reversingId === e.id ? "..." : "عكس القيد"}
                  </button>
                )}
              </div>
            </div>
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-right py-1 font-medium">الحساب</th>
                  <th className="text-right py-1 font-medium">مدين</th>
                  <th className="text-right py-1 font-medium">دائن</th>
                </tr>
              </thead>
              <tbody>
                {e.lines.map((l) => (
                  <tr key={l.id} className="border-t border-gray-50">
                    <td className="py-1.5 text-gray-700">{l.account.code} — {l.account.name}</td>
                    <td className="py-1.5 text-gray-600">{l.debit > 0 ? l.debit.toLocaleString() : "—"}</td>
                    <td className="py-1.5 text-gray-600">{l.credit > 0 ? l.credit.toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">لا توجد قيود مرحّلة بعد.</p>
        )}
      </div>
    </div>
  );
}
