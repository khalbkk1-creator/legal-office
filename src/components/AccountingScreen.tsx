"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MarkPaidButton from "@/app/(app)/sales/MarkPaidButton";
import DeleteExpenseButton from "@/app/(app)/expenses/DeleteExpenseButton";

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
  OPENING_BALANCE: "رصيد افتتاحي",
  RECURRING: "قيد متكرر",
  PAYMENT_REQUEST_DISBURSEMENT: "دفعة طلب صرف",
  PAYMENT_REQUEST_CLOSE: "إقفال طلب صرف",
};

type Account = { id: string; code: string; name: string; type: string; isSystem: boolean; isActive: boolean; parentId: string | null };
type Sale = {
  id: string;
  invoiceNumber: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  vatAmount: number;
  saleDate: string;
  paymentStatus: string;
  client: { name: string };
  case: { id: string; caseNumber: string } | null;
};
type Expense = {
  id: string;
  description: string;
  amount: number;
  vatAmount: number;
  expenseDate: string;
  receiptUrl: string | null;
  receiptName: string | null;
  category: { name: string } | null;
  case: { id: string; caseNumber: string } | null;
};

const saleStatusLabels: Record<string, { label: string; color: string }> = {
  PAID: { label: "مدفوعة", color: "bg-primary-50 text-primary-700" },
  UNPAID: { label: "غير مدفوعة", color: "bg-red-50 text-red-600" },
  PARTIAL: { label: "مدفوعة جزئياً", color: "bg-amber-50 text-amber-700" },
};
type JournalLine = { id: string; debit: number; credit: number; description: string | null; account: Account };
type JournalEntry = {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: string;
  sourceType: string | null;
  createdBy: { name: string } | null;
  lines: JournalLine[];
  reversalOfId: string | null;
  reversedBy: { id: string; entryNumber: string } | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
};
type TrialBalanceRow = { id: string; code: string; name: string; type: string; debit: number; credit: number; balance: number };

export default function AccountingScreen({
  accounts,
  entries,
  trialBalance,
  sales,
  expenses,
  salesSummary,
  expenseSummary,
  auditLog,
  openingBalanceEntry,
  periodLock,
  recurringEntries,
  initialTab,
}: {
  accounts: Account[];
  entries: JournalEntry[];
  trialBalance: TrialBalanceRow[];
  sales: Sale[];
  expenses: Expense[];
  salesSummary: { totalThisMonth: number; totalOutstanding: number; topCases: { title: string; total: number }[] };
  expenseSummary: { totalThisMonth: number; topCategories: [string, number][] };
  auditLog: { id: string; userName: string; action: string; entityType: string; entityId: string | null; description: string; createdAt: string }[];
  openingBalanceEntry: { id: string; date: string; lines: { accountId: string; debit: number; credit: number }[] } | null;
  periodLock: { id: string; lockedUntil: string; lockedByName: string } | null;
  recurringEntries: {
    id: string;
    description: string;
    dayOfMonth: number;
    isActive: boolean;
    lastPostedYear: number | null;
    lastPostedMonth: number | null;
    lines: { id: string; debit: number; credit: number; account: Account }[];
  }[];
  initialTab?: "invoices" | "expenses" | "journal" | "accounts" | "trial" | "statements" | "vat" | "audit" | "aging" | "opening" | "lock" | "recurring" | "reconciliation";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"invoices" | "expenses" | "journal" | "accounts" | "trial" | "statements" | "vat" | "audit" | "aging" | "opening" | "lock" | "recurring" | "reconciliation">(initialTab ?? "journal");

  const totalDebit = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalCredit = trialBalance.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">النظام المحاسبي</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === "invoices" ? "فواتير الخدمات والإيرادات" : tab === "expenses" ? "مصاريف المكتب التشغيلية" : tab === "statements" ? "قائمة الدخل والميزانية العمومية" : "دليل الحسابات والقيود اليومية وميزان المراجعة"}
          </p>
        </div>
        {(tab === "invoices" || tab === "expenses") && (
          <Link
            href={tab === "invoices" ? "/sales/new" : "/expenses/new"}
            className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
          >
            {tab === "invoices" ? "+ فاتورة جديدة" : "+ مصروف جديد"}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setTab("invoices")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "invoices" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          💰 الفواتير
        </button>
        <button
          onClick={() => setTab("expenses")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "expenses" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          💸 المصاريف
        </button>
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
        <button
          onClick={() => setTab("statements")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "statements" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📄 القوائم المالية
        </button>
        <button
          onClick={() => setTab("vat")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "vat" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🧾 ضريبة القيمة المضافة
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "audit" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📜 سجل التدقيق
        </button>
        <button
          onClick={() => setTab("aging")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "aging" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📅 أعمار الديون
        </button>
        <button
          onClick={() => setTab("opening")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "opening" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🏁 الأرصدة الافتتاحية
        </button>
        <button
          onClick={() => setTab("lock")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "lock" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🔒 إقفال الفترات
        </button>
        <button
          onClick={() => setTab("recurring")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "recurring" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🔁 القيود المتكررة
        </button>
        <button
          onClick={() => setTab("reconciliation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "reconciliation" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🏦 مطابقة البنك
        </button>
      </div>

      {tab === "invoices" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-1">مبيعات هذا الشهر</p>
              <p className="text-2xl font-bold text-ink">{salesSummary.totalThisMonth.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-1">إجمالي المستحق</p>
              <p className="text-2xl font-bold text-red-600">{salesSummary.totalOutstanding.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-2">أعلى القضايا إيراداً</p>
              {salesSummary.topCases.length === 0 ? (
                <p className="text-xs text-gray-400">لا توجد بيانات بعد</p>
              ) : (
                <div className="space-y-1">
                  {salesSummary.topCases.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate">{c.title}</span>
                      <span className="text-ink font-medium">{c.total.toLocaleString()} ر.س</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-right px-5 py-3 font-medium">رقم الفاتورة</th>
                  <th className="text-right px-5 py-3 font-medium">العميل</th>
                  <th className="text-right px-5 py-3 font-medium">القضية</th>
                  <th className="text-right px-5 py-3 font-medium">الوصف</th>
                  <th className="text-right px-5 py-3 font-medium">الإجمالي</th>
                  <th className="text-right px-5 py-3 font-medium">الحالة</th>
                  <th className="text-right px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
                    <td className="px-5 py-3 font-medium text-ink">{s.invoiceNumber}</td>
                    <td className="px-5 py-3 text-gray-600">{s.client.name}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {s.case ? (
                        <Link href={`/cases/${s.case.id}`} className="text-primary-700 hover:underline">
                          {s.case.caseNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.description}</td>
                    <td className="px-5 py-3 text-ink font-medium">{s.totalAmount.toLocaleString()} ر.س</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${saleStatusLabels[s.paymentStatus].color}`}>
                        {saleStatusLabels[s.paymentStatus].label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {s.paymentStatus !== "PAID" && <MarkPaidButton saleId={s.id} totalAmount={s.totalAmount} />}
                        <Link href={`/sales/${s.id}/edit`} className="text-xs text-primary-700 hover:underline">
                          تعديل
                        </Link>
                        <Link href={`/print/sales/${s.id}`} target="_blank" className="text-xs text-gray-500 hover:underline">
                          طباعة
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                      لا توجد فواتير مسجّلة بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "expenses" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-1">مصاريف هذا الشهر</p>
              <p className="text-2xl font-bold text-red-600">{expenseSummary.totalThisMonth.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-2">أعلى بنود المصروفات هذا الشهر</p>
              {expenseSummary.topCategories.length === 0 ? (
                <p className="text-xs text-gray-400">لا توجد بيانات بعد</p>
              ) : (
                <div className="space-y-1">
                  {expenseSummary.topCategories.map(([name, total]) => (
                    <div key={name} className="flex justify-between text-xs">
                      <span className="text-gray-600">{name}</span>
                      <span className="text-ink font-medium">{total.toLocaleString()} ر.س</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-right px-5 py-3 font-medium">التاريخ</th>
                  <th className="text-right px-5 py-3 font-medium">الوصف</th>
                  <th className="text-right px-5 py-3 font-medium">التصنيف</th>
                  <th className="text-right px-5 py-3 font-medium">القضية</th>
                  <th className="text-right px-5 py-3 font-medium">المبلغ</th>
                  <th className="text-right px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-gray-50 hover:bg-red-50/20 transition">
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(e.expenseDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-ink font-medium">{e.description}</td>
                    <td className="px-5 py-3 text-gray-600">{e.category?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {e.case ? (
                        <Link href={`/cases/${e.case.id}`} className="text-primary-700 hover:underline">
                          {e.case.caseNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-red-600 font-medium">{e.amount.toLocaleString()} ر.س</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <AttachmentUpload
                          uploadUrl={`/api/expenses/${e.id}/receipt`}
                          existingUrl={e.receiptUrl}
                          existingName={e.receiptName}
                          onUploaded={() => router.refresh()}
                        />
                        <DeleteExpenseButton expenseId={e.id} />
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                      لا توجد مصاريف مسجّلة بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "journal" && <JournalTab entries={entries} accounts={accounts} />}

      {tab === "accounts" && <AccountsTab accounts={accounts} trialBalance={trialBalance} />}

      {tab === "trial" && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <a
              href="/print/accounting/trial-balance"
              target="_blank"
              className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
            >
              🖨️ PDF
            </a>
            <a
              href="/api/accounting/export?type=trial-balance"
              className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
            >
              📊 تصدير Excel
            </a>
          </div>
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
        </div>
      )}

      {tab === "statements" && <FinancialStatementsTab trialBalance={trialBalance} />}

      {tab === "vat" && <VatReportTab sales={sales} expenses={expenses} />}

      {tab === "audit" && <AuditLogTab logs={auditLog} />}

      {tab === "aging" && <AgingReportTab sales={sales} />}

      {tab === "opening" && <OpeningBalancesTab accounts={accounts} existingEntry={openingBalanceEntry} />}

      {tab === "lock" && <PeriodLockTab periodLock={periodLock} />}

      {tab === "recurring" && <RecurringEntriesTab accounts={accounts} templates={recurringEntries} />}

      {tab === "reconciliation" && <ReconciliationTab accounts={accounts} />}
    </div>
  );
}

function AccountsTab({ accounts, trialBalance }: { accounts: Account[]; trialBalance: TrialBalanceRow[] }) {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", type: "EXPENSE", parentId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ code: "", name: "", type: "", parentId: "" });
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);

  const balanceByAccount: Record<string, number> = {};
  for (const r of trialBalance) balanceByAccount[r.id] = r.balance;

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
      body: JSON.stringify({
        name: editForm.name,
        code: editForm.code,
        type: editForm.type,
        parentId: editForm.parentId || null,
      }),
    });
    setEditingId(null);
    router.refresh();
  }

  function startEdit(a: Account) {
    setEditingId(a.id);
    setEditForm({ code: a.code, name: a.name, type: a.type, parentId: a.parentId ?? "" });
  }

  function toggleCollapse(id: string) {
    setCollapsed((c) => {
      const next = new Set(c);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  async function resetChart() {
    const first = confirm(
      "⚠️ تحذير خطير: هذا الإجراء يحذف كل الحسابات وكل القيود اليومية المرحّلة نهائياً، ويبني دليل حسابات نظيف من جديد بـ3 مستويات. هذا لا يمكن التراجع عنه. متأكد؟"
    );
    if (!first) return;
    const second = confirm("تأكيد أخير: راح تُحذف كل القيود المحاسبية بدون استثناء. اكتب OK بذهنك وتأكد إنك مستعد. تكمل؟");
    if (!second) return;

    setResetting(true);
    const res = await fetch("/api/accounting/reset", { method: "POST" });
    setResetting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذر إعادة التعيين");
      return;
    }
    router.refresh();
  }

  const parentOptions = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  const searchLower = search.trim().toLowerCase();
  const matchesSearch = (a: Account) =>
    !searchLower || a.name.toLowerCase().includes(searchLower) || a.code.includes(searchLower);

  // إذا فيه بحث نشط، نحدد كل الحسابات المطابقة + أسلافها عشان يبين السياق
  const visibleIds = new Set<string>();
  if (searchLower) {
    const byId: Record<string, Account> = {};
    for (const a of accounts) byId[a.id] = a;
    for (const a of accounts) {
      if (matchesSearch(a)) {
        let cur: Account | undefined = a;
        while (cur) {
          visibleIds.add(cur.id);
          cur = cur.parentId ? byId[cur.parentId] : undefined;
        }
      }
    }
  }

  // بناء شجرة حقيقية متعددة المستويات مرتبة حسب الأصل والفرع
  function buildTree(parentId: string | null, depth: number): { account: Account; depth: number }[] {
    const children = accounts
      .filter((a) => a.parentId === parentId)
      .filter((a) => !searchLower || visibleIds.has(a.id))
      .sort((a, b) => a.code.localeCompare(b.code));
    let result: { account: Account; depth: number }[] = [];
    for (const child of children) {
      result.push({ account: child, depth });
      const isCollapsed = !searchLower && collapsed.has(child.id);
      if (!isCollapsed) {
        result = result.concat(buildTree(child.id, depth + 1));
      }
    }
    return result;
  }
  const tree = buildTree(null, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          onClick={resetChart}
          disabled={resetting}
          className="text-xs text-red-600 hover:underline disabled:opacity-60"
        >
          {resetting ? "جاري إعادة التعيين..." : "🗑️ إعادة تعيين الدليل بالكامل"}
        </button>
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

      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ابحث برقم أو اسم الحساب..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">الرقم</th>
              <th className="text-right px-5 py-3 font-medium">اسم الحساب</th>
              <th className="text-right px-5 py-3 font-medium">النوع</th>
              <th className="text-right px-5 py-3 font-medium">الرصيد</th>
              <th className="text-right px-5 py-3 font-medium">الحالة</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tree.map(({ account: a, depth }) => {
              const hasChildren = accounts.some((c) => c.parentId === a.id);
              const isCollapsed = collapsed.has(a.id);
              const balance = balanceByAccount[a.id];
              return (
                <tr key={a.id} className={`border-t border-gray-50 ${!a.isActive ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3 text-gray-500 font-mono">{a.code}</td>
                  <td className="px-5 py-3" style={{ paddingRight: `${20 + depth * 24}px` }}>
                    {editingId === a.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-sm w-32"
                          placeholder="الاسم"
                        />
                        {!a.isSystem && (
                          <>
                            <input
                              value={editForm.code}
                              onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-sm w-20"
                              dir="ltr"
                              placeholder="الرقم"
                            />
                            <select
                              value={editForm.type}
                              onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                            >
                              {Object.entries(typeLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                            <select
                              value={editForm.parentId}
                              onChange={(e) => setEditForm((f) => ({ ...f, parentId: e.target.value }))}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                            >
                              <option value="">بدون حساب رئيسي</option>
                              {parentOptions.filter((p) => p.id !== a.id).map((p) => (
                                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                              ))}
                            </select>
                          </>
                        )}
                        <button onClick={() => saveEdit(a.id)} className="text-xs text-primary-700 hover:underline">حفظ</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {hasChildren && (
                          <button onClick={() => toggleCollapse(a.id)} className="text-gray-400 hover:text-gray-600 text-xs w-4">
                            {isCollapsed ? "▸" : "▾"}
                          </button>
                        )}
                        {hasChildren ? (
                          <span className="font-bold text-ink">{a.name}</span>
                        ) : (
                          <Link href={`/accounting/ledger/${a.id}`} className="text-primary-700 hover:underline">
                            {a.name}
                          </Link>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeColors[a.type]}`}>{typeLabels[a.type]}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {balance !== undefined ? balance.toLocaleString() : "—"}
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
                        <button onClick={() => startEdit(a)} className="text-xs text-primary-700 hover:underline">
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
              );
            })}
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
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLines, setEditLines] = useState<{ accountId: string; debit: string; credit: string }[]>([]);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState([
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = lines.length >= 2 && totalDebit > 0 && Math.round(totalDebit * 100) === Math.round(totalCredit * 100);

  const filteredEntries = entries.filter((e) => {
    if (filterFrom && new Date(e.date) < new Date(filterFrom + "T00:00:00")) return false;
    if (filterTo && new Date(e.date) > new Date(filterTo + "T23:59:59")) return false;
    if (filterStatus !== "ALL" && e.status !== filterStatus) return false;
    if (filterSource !== "ALL" && e.sourceType !== filterSource) return false;
    return true;
  });

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

  function startEditDraft(e: JournalEntry) {
    setEditingEntryId(e.id);
    setEditDescription(e.description);
    setEditDate(e.date.slice(0, 10));
    setEditLines(e.lines.map((l) => ({ accountId: l.account.id, debit: l.debit ? String(l.debit) : "", credit: l.credit ? String(l.credit) : "" })));
    setEditError("");
  }

  function updateEditLine(i: number, field: "accountId" | "debit" | "credit", value: string) {
    setEditLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }
  function addEditLine() {
    setEditLines((ls) => [...ls, { accountId: "", debit: "", credit: "" }]);
  }
  function removeEditLine(i: number) {
    setEditLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  async function saveEditDraft(id: string) {
    const totalDebit = editLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = editLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100) || totalDebit === 0) {
      setEditError("القيد غير متوازن — مجموع المدين لازم يساوي مجموع الدائن");
      return;
    }
    setEditSaving(true);
    setEditError("");
    const res = await fetch(`/api/accounting/journal-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: editDescription,
        date: editDate,
        lines: editLines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error || "تعذر حفظ التعديلات");
      return;
    }
    setEditingEntryId(null);
    router.refresh();
  }

  async function confirmDraft(id: string) {
    setReversingId(id);
    const res = await fetch(`/api/accounting/journal-entries/${id}/confirm`, { method: "POST" });
    setReversingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذر اعتماد القيد");
      return;
    }
    router.refresh();
  }

  async function deleteEntry(id: string) {
    if (!confirm("تحذير: حذف القيد نهائي ولا يمكن التراجع عنه، وقد يسبب فرق بين البيانات الفعلية (فاتورة/مصروف) والقيود المحاسبية. الأفضل عادة استخدام \"عكس القيد\" بدلاً من الحذف. متأكد تبي تحذفه؟")) return;
    setReversingId(id);
    const res = await fetch(`/api/accounting/journal-entries/${id}`, { method: "DELETE" });
    setReversingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذر حذف القيد");
      return;
    }
    router.refresh();
  }

  async function submit(e: React.SyntheticEvent, status: "DRAFT" | "POSTED" = "POSTED") {
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
        date: entryDate,
        status,
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
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <a
            href="/print/accounting/journal"
            target="_blank"
            className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
          >
            🖨️ PDF
          </a>
          <a
            href="/api/accounting/export?type=journal"
            className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
          >
            📊 تصدير Excel
          </a>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          {showForm ? "إلغاء" : "+ قيد يدوي جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف القيد"
              className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              required
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <AccountPicker
                  accounts={accounts}
                  value={l.accountId}
                  onChange={(id) => updateLine(i, "accountId", id)}
                />
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

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving || !balanced}
              className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "جاري الترحيل..." : "ترحيل القيد مباشرة"}
            </button>
            <button
              type="button"
              onClick={(e) => submit(e, "DRAFT")}
              disabled={saving || !balanced}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              حفظ كمسودة
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">الحالة</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            <option value="ALL">الكل</option>
            <option value="POSTED">معتمد</option>
            <option value="DRAFT">مسودة</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">المصدر</label>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            <option value="ALL">الكل</option>
            {Object.entries(sourceLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {(filterFrom || filterTo || filterStatus !== "ALL" || filterSource !== "ALL") && (
          <button
            onClick={() => { setFilterFrom(""); setFilterTo(""); setFilterStatus("ALL"); setFilterSource("ALL"); }}
            className="text-xs text-gray-400 hover:underline"
          >
            مسح الفلاتر
          </button>
        )}
        <span className="text-xs text-gray-400 mr-auto">{filteredEntries.length} من {entries.length} قيد</span>
      </div>

      <div className="space-y-3">
        {filteredEntries.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-ink">{e.entryNumber}</p>
                <p className="text-xs text-gray-400">{e.description}</p>
                {e.createdBy && <p className="text-xs text-gray-400 mt-0.5">بواسطة: {e.createdBy.name}</p>}
                <div className="mt-1">
                  <AttachmentUpload
                    uploadUrl={`/api/accounting/journal-entries/${e.id}/attachment`}
                    existingUrl={e.attachmentUrl}
                    existingName={e.attachmentName}
                    onUploaded={() => router.refresh()}
                  />
                </div>
              </div>
              <div className="text-left">
                {e.status === "DRAFT" && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 font-medium ml-1">مسودة</span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                  {e.sourceType ? sourceLabels[e.sourceType] ?? e.sourceType : "—"}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(e.date).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                </p>
                {e.status === "DRAFT" && (
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => confirmDraft(e.id)}
                      disabled={reversingId === e.id}
                      className="text-xs text-primary-700 hover:underline disabled:opacity-60"
                    >
                      {reversingId === e.id ? "..." : "✓ اعتماد القيد"}
                    </button>
                    <button
                      onClick={() => startEditDraft(e)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      تعديل
                    </button>
                  </div>
                )}
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
                <button
                  onClick={() => deleteEntry(e.id)}
                  disabled={reversingId === e.id}
                  className="text-xs text-gray-400 hover:text-red-600 hover:underline mt-1 block disabled:opacity-60"
                >
                  حذف نهائي
                </button>
              </div>
            </div>
            {editingEntryId === e.id ? (
              <div className="mt-2 space-y-2 border-t border-gray-100 pt-3">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={editDescription}
                    onChange={(ev) => setEditDescription(ev.target.value)}
                    className="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="date"
                    value={editDate}
                    onChange={(ev) => setEditDate(ev.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                {editLines.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AccountPicker accounts={accounts} value={l.accountId} onChange={(id) => updateEditLine(i, "accountId", id)} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.debit}
                      onChange={(ev) => updateEditLine(i, "debit", ev.target.value)}
                      placeholder="مدين"
                      className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.credit}
                      onChange={(ev) => updateEditLine(i, "credit", ev.target.value)}
                      placeholder="دائن"
                      className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    {editLines.length > 2 && (
                      <button type="button" onClick={() => removeEditLine(i)} className="text-red-500 text-sm px-1">✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addEditLine} className="text-xs text-primary-700 hover:underline">+ إضافة سطر</button>
                {editError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">{editError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveEditDraft(e.id)}
                    disabled={editSaving}
                    className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 disabled:opacity-60"
                  >
                    {editSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </button>
                  <button onClick={() => setEditingEntryId(null)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">لا توجد قيود مرحّلة بعد.</p>
        )}
        {entries.length > 0 && filteredEntries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">لا توجد قيود تطابق الفلاتر المحددة.</p>
        )}
      </div>
    </div>
  );
}

function FinancialStatementsTab({ trialBalance }: { trialBalance: TrialBalanceRow[] }) {
  const revenues = trialBalance.filter((r) => r.type === "REVENUE");
  const expenses = trialBalance.filter((r) => r.type === "EXPENSE");
  const assets = trialBalance.filter((r) => r.type === "ASSET");
  const liabilities = trialBalance.filter((r) => r.type === "LIABILITY");
  const equity = trialBalance.filter((r) => r.type === "EQUITY");

  const totalRevenue = revenues.reduce((s, r) => s + r.balance, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquity = equity.reduce((s, r) => s + r.balance, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netIncome;

  const today = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <a
          href="/print/accounting/statements"
          target="_blank"
          className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
        >
          🖨️ PDF
        </a>
        <a
          href="/api/accounting/export?type=statements"
          className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
        >
          📊 تصدير Excel
        </a>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* قائمة الدخل */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-1">قائمة الدخل</h2>
          <p className="text-xs text-gray-400 mb-4">حتى تاريخ {today}</p>

          <p className="text-xs font-medium text-gray-500 mb-2">الإيرادات</p>
          <div className="space-y-1.5 mb-4">
            {revenues.map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{r.name}</span>
                <span className="text-ink">{r.balance.toLocaleString()} ر.س</span>
              </div>
            ))}
            {revenues.length === 0 && <p className="text-xs text-gray-400">لا توجد إيرادات مسجّلة</p>}
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5">
              <span>إجمالي الإيرادات</span>
              <span>{totalRevenue.toLocaleString()} ر.س</span>
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-2">المصروفات</p>
          <div className="space-y-1.5 mb-4">
            {expenses.map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{r.name}</span>
                <span className="text-ink">{r.balance.toLocaleString()} ر.س</span>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-xs text-gray-400">لا توجد مصروفات مسجّلة</p>}
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5">
              <span>إجمالي المصروفات</span>
              <span>{totalExpenses.toLocaleString()} ر.س</span>
            </div>
          </div>

          <div className={`flex justify-between text-base font-bold rounded-lg p-3 ${netIncome >= 0 ? "bg-primary-50 text-primary-700" : "bg-red-50 text-red-600"}`}>
            <span>{netIncome >= 0 ? "صافي الربح" : "صافي الخسارة"}</span>
            <span>{netIncome.toLocaleString()} ر.س</span>
          </div>
        </div>

        {/* الميزانية العمومية */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-1">الميزانية العمومية</h2>
          <p className="text-xs text-gray-400 mb-4">كما في تاريخ {today}</p>

          <p className="text-xs font-medium text-gray-500 mb-2">الأصول</p>
          <div className="space-y-1.5 mb-4">
            {assets.map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{r.name}</span>
                <span className="text-ink">{r.balance.toLocaleString()} ر.س</span>
              </div>
            ))}
            {assets.length === 0 && <p className="text-xs text-gray-400">لا توجد أصول مسجّلة</p>}
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5">
              <span>إجمالي الأصول</span>
              <span>{totalAssets.toLocaleString()} ر.س</span>
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-2">الالتزامات</p>
          <div className="space-y-1.5 mb-4">
            {liabilities.map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{r.name}</span>
                <span className="text-ink">{r.balance.toLocaleString()} ر.س</span>
              </div>
            ))}
            {liabilities.length === 0 && <p className="text-xs text-gray-400">لا توجد التزامات مسجّلة</p>}
            <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-1.5">
              <span>إجمالي الالتزامات</span>
              <span>{totalLiabilities.toLocaleString()} ر.س</span>
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-2">حقوق الملكية</p>
          <div className="space-y-1.5 mb-4">
            {equity.map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{r.name}</span>
                <span className="text-ink">{r.balance.toLocaleString()} ر.س</span>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">صافي ربح الفترة الحالية</span>
              <span className="text-ink">{netIncome.toLocaleString()} ر.س</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-1.5">
              <span>إجمالي حقوق الملكية</span>
              <span>{(totalEquity + netIncome).toLocaleString()} ر.س</span>
            </div>
          </div>

          <div className="flex justify-between text-base font-bold bg-gray-50 rounded-lg p-3 mb-2">
            <span>إجمالي الالتزامات وحقوق الملكية</span>
            <span>{totalLiabilitiesAndEquity.toLocaleString()} ر.س</span>
          </div>

          {Math.round(totalAssets * 100) === Math.round(totalLiabilitiesAndEquity * 100) ? (
            <p className="text-xs text-primary-700 text-center">الميزانية متوازنة ✓ (الأصول = الالتزامات + حقوق الملكية)</p>
          ) : (
            <p className="text-xs text-red-600 text-center">
              غير متوازنة — فرق {(totalAssets - totalLiabilitiesAndEquity).toLocaleString()} ر.س
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function VatReportTab({ sales, expenses }: { sales: Sale[]; expenses: Expense[] }) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);

  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T23:59:59");

  const salesInRange = sales.filter((s) => {
    const d = new Date(s.saleDate);
    return d >= fromDate && d <= toDate;
  });
  const expensesInRange = expenses.filter((e) => {
    const d = new Date(e.expenseDate);
    return d >= fromDate && d <= toDate;
  });

  const outputVat = salesInRange.reduce((sum, s) => sum + s.vatAmount, 0);
  const inputVat = expensesInRange.reduce((sum, e) => sum + e.vatAmount, 0);
  const netDue = outputVat - inputVat;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-end gap-3 flex-wrap justify-between">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`/print/accounting/vat?from=${from}&to=${to}`}
              target="_blank"
              className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
            >
              🖨️ PDF
            </a>
            <a
              href={`/api/accounting/export?type=vat&from=${from}&to=${to}`}
              className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
            >
              📊 تصدير Excel
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">ضريبة المخرجات (على المبيعات)</p>
          <p className="text-2xl font-bold text-primary-700">{outputVat.toLocaleString()} ر.س</p>
          <p className="text-xs text-gray-400 mt-1">{salesInRange.length} فاتورة</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">ضريبة المدخلات (القابلة للخصم)</p>
          <p className="text-2xl font-bold text-blue-700">{inputVat.toLocaleString()} ر.س</p>
          <p className="text-xs text-gray-400 mt-1">{expensesInRange.length} مصروف</p>
        </div>
        <div className={`rounded-2xl border p-6 ${netDue >= 0 ? "bg-red-50 border-red-100" : "bg-primary-50 border-primary-100"}`}>
          <p className="text-xs text-gray-500 mb-1">{netDue >= 0 ? "الضريبة المستحقة للتوريد" : "رصيد ضريبي لصالحك"}</p>
          <p className={`text-2xl font-bold ${netDue >= 0 ? "text-red-600" : "text-primary-700"}`}>
            {Math.abs(netDue).toLocaleString()} ر.س
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">فواتير الفترة</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-5 py-2 font-medium">الفاتورة</th>
                <th className="text-right px-5 py-2 font-medium">التاريخ</th>
                <th className="text-right px-5 py-2 font-medium">الضريبة</th>
              </tr>
            </thead>
            <tbody>
              {salesInRange.map((s) => (
                <tr key={s.id} className="border-t border-gray-50">
                  <td className="px-5 py-2 text-ink">{s.invoiceNumber}</td>
                  <td className="px-5 py-2 text-gray-500">{new Date(s.saleDate).toLocaleDateString("ar-SA")}</td>
                  <td className="px-5 py-2 text-gray-700">{s.vatAmount.toLocaleString()}</td>
                </tr>
              ))}
              {salesInRange.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-gray-400">لا توجد فواتير بهذه الفترة</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">مصاريف الفترة (فيها ضريبة مدخلات)</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-5 py-2 font-medium">المصروف</th>
                <th className="text-right px-5 py-2 font-medium">التاريخ</th>
                <th className="text-right px-5 py-2 font-medium">الضريبة</th>
              </tr>
            </thead>
            <tbody>
              {expensesInRange.filter((e) => e.vatAmount > 0).map((e) => (
                <tr key={e.id} className="border-t border-gray-50">
                  <td className="px-5 py-2 text-ink">{e.description}</td>
                  <td className="px-5 py-2 text-gray-500">{new Date(e.expenseDate).toLocaleDateString("ar-SA")}</td>
                  <td className="px-5 py-2 text-gray-700">{e.vatAmount.toLocaleString()}</td>
                </tr>
              ))}
              {expensesInRange.filter((e) => e.vatAmount > 0).length === 0 && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-gray-400">لا توجد مصاريف فيها ضريبة مدخلات بهذه الفترة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const actionLabels: Record<string, { label: string; color: string }> = {
  CREATE: { label: "إنشاء", color: "bg-primary-50 text-primary-700" },
  UPDATE: { label: "تعديل", color: "bg-amber-50 text-amber-700" },
  DELETE: { label: "حذف", color: "bg-red-50 text-red-600" },
  REVERSE: { label: "عكس", color: "bg-purple-50 text-purple-700" },
  RESET: { label: "إعادة تعيين", color: "bg-red-50 text-red-600" },
};

function AuditLogTab({
  logs,
}: {
  logs: { id: string; userName: string; action: string; entityType: string; entityId: string | null; description: string; createdAt: string }[];
}) {
  const [filter, setFilter] = useState("");
  const filtered = logs.filter(
    (l) =>
      !filter ||
      l.userName.toLowerCase().includes(filter.toLowerCase()) ||
      l.description.toLowerCase().includes(filter.toLowerCase()) ||
      l.entityType.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="🔍 ابحث بالموظف أو النوع أو الوصف..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">التاريخ</th>
              <th className="text-right px-5 py-3 font-medium">الموظف</th>
              <th className="text-right px-5 py-3 font-medium">الإجراء</th>
              <th className="text-right px-5 py-3 font-medium">النوع</th>
              <th className="text-right px-5 py-3 font-medium">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-gray-50">
                <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" })}
                  {" — "}
                  {new Date(l.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-5 py-3 text-ink font-medium whitespace-nowrap">{l.userName}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${actionLabels[l.action]?.color ?? "bg-gray-100 text-gray-600"}`}>
                    {actionLabels[l.action]?.label ?? l.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{l.entityType}</td>
                <td className="px-5 py-3 text-gray-700">{l.description}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400">لا توجد سجلات مطابقة.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgingReportTab({ sales }: { sales: Sale[] }) {
  const unpaid = sales.filter((s) => s.paymentStatus !== "PAID" && s.totalAmount - s.paidAmount > 0.01);
  const now = new Date();

  function bucketOf(days: number) {
    if (days <= 30) return "0-30";
    if (days <= 60) return "31-60";
    if (days <= 90) return "61-90";
    return "أكثر من 90";
  }

  const rows = unpaid.map((s) => {
    const days = Math.floor((now.getTime() - new Date(s.saleDate).getTime()) / (1000 * 60 * 60 * 24));
    return { sale: s, days: Math.max(0, days), outstanding: s.totalAmount - s.paidAmount, bucket: bucketOf(Math.max(0, days)) };
  });

  const buckets = ["0-30", "31-60", "61-90", "أكثر من 90"];
  const bucketTotals: Record<string, number> = { "0-30": 0, "31-60": 0, "61-90": 0, "أكثر من 90": 0 };
  for (const r of rows) bucketTotals[r.bucket] += r.outstanding;
  const grandTotal = rows.reduce((s, r) => s + r.outstanding, 0);

  // تجميع حسب العميل
  const byClient: Record<string, { name: string; buckets: Record<string, number>; total: number }> = {};
  for (const r of rows) {
    const key = r.sale.client.name;
    if (!byClient[key]) byClient[key] = { name: key, buckets: { "0-30": 0, "31-60": 0, "61-90": 0, "أكثر من 90": 0 }, total: 0 };
    byClient[key].buckets[r.bucket] += r.outstanding;
    byClient[key].total += r.outstanding;
  }
  const clientRows = Object.values(byClient).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <a
          href="/print/accounting/aging"
          target="_blank"
          className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
        >
          🖨️ PDF
        </a>
        <a
          href="/api/accounting/export?type=aging"
          className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
        >
          📊 تصدير Excel
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <div key={b} className={`rounded-2xl border p-4 ${b === "أكثر من 90" ? "bg-red-50 border-red-100" : "bg-white border-gray-100 shadow-sm"}`}>
            <p className="text-xs text-gray-500 mb-1">{b} يوم</p>
            <p className={`text-lg font-bold ${b === "أكثر من 90" ? "text-red-600" : "text-ink"}`}>{bucketTotals[b].toLocaleString()} ر.س</p>
          </div>
        ))}
      </div>

      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex justify-between items-center">
        <span className="text-sm text-primary-800 font-medium">إجمالي المستحقات غير المسددة</span>
        <span className="text-xl font-bold text-primary-700">{grandTotal.toLocaleString()} ر.س</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">حسب العميل</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-2 font-medium">العميل</th>
              <th className="text-right px-5 py-2 font-medium">0-30</th>
              <th className="text-right px-5 py-2 font-medium">31-60</th>
              <th className="text-right px-5 py-2 font-medium">61-90</th>
              <th className="text-right px-5 py-2 font-medium">أكثر من 90</th>
              <th className="text-right px-5 py-2 font-medium">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {clientRows.map((c) => (
              <tr key={c.name} className="border-t border-gray-50">
                <td className="px-5 py-2 text-ink font-medium">{c.name}</td>
                <td className="px-5 py-2 text-gray-600">{c.buckets["0-30"] > 0 ? c.buckets["0-30"].toLocaleString() : "—"}</td>
                <td className="px-5 py-2 text-gray-600">{c.buckets["31-60"] > 0 ? c.buckets["31-60"].toLocaleString() : "—"}</td>
                <td className="px-5 py-2 text-gray-600">{c.buckets["61-90"] > 0 ? c.buckets["61-90"].toLocaleString() : "—"}</td>
                <td className="px-5 py-2 text-red-600 font-medium">{c.buckets["أكثر من 90"] > 0 ? c.buckets["أكثر من 90"].toLocaleString() : "—"}</td>
                <td className="px-5 py-2 text-ink font-bold">{c.total.toLocaleString()}</td>
              </tr>
            ))}
            {clientRows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">لا توجد مستحقات غير مسددة 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">تفصيل الفواتير</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-2 font-medium">الفاتورة</th>
              <th className="text-right px-5 py-2 font-medium">العميل</th>
              <th className="text-right px-5 py-2 font-medium">عدد الأيام</th>
              <th className="text-right px-5 py-2 font-medium">الفئة</th>
              <th className="text-right px-5 py-2 font-medium">المبلغ المستحق</th>
            </tr>
          </thead>
          <tbody>
            {rows.sort((a, b) => b.days - a.days).map((r) => (
              <tr key={r.sale.id} className="border-t border-gray-50">
                <td className="px-5 py-2 text-ink">{r.sale.invoiceNumber}</td>
                <td className="px-5 py-2 text-gray-600">{r.sale.client.name}</td>
                <td className="px-5 py-2 text-gray-600">{r.days} يوم</td>
                <td className="px-5 py-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${r.bucket === "أكثر من 90" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                    {r.bucket}
                  </span>
                </td>
                <td className="px-5 py-2 text-ink font-medium">{r.outstanding.toLocaleString()} ر.س</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">لا توجد فواتير مستحقة</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OpeningBalancesTab({
  accounts,
  existingEntry,
}: {
  accounts: Account[];
  existingEntry: { id: string; date: string; lines: { accountId: string; debit: number; credit: number }[] } | null;
}) {
  const router = useRouter();

  // خانات الحسابات فقط (بدون رؤوس الفئات اللي لها فروع)، وبدون حساب موازنة الأرصدة الافتتاحية نفسه
  const detailAccounts = accounts
    .filter((a) => !accounts.some((c) => c.parentId === a.id))
    .filter((a) => a.code !== "3300")
    .sort((a, b) => a.code.localeCompare(b.code));

  const existingByAccount: Record<string, number> = {};
  if (existingEntry) {
    for (const l of existingEntry.lines) {
      const account = accounts.find((a) => a.id === l.accountId);
      if (!account || account.code === "3300") continue;
      const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
      existingByAccount[l.accountId] = isDebitNormal ? l.debit : l.credit;
    }
  }

  const [date, setDate] = useState(existingEntry ? existingEntry.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(existingByAccount).map(([k, v]) => [k, v ? String(v) : ""]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function updateValue(accountId: string, value: string) {
    setValues((v) => ({ ...v, [accountId]: value }));
  }

  const totalDebit = detailAccounts.reduce((sum, a) => {
    const isDebitNormal = a.type === "ASSET" || a.type === "EXPENSE";
    const v = Number(values[a.id]) || 0;
    return sum + (isDebitNormal ? v : 0);
  }, 0);
  const totalCredit = detailAccounts.reduce((sum, a) => {
    const isDebitNormal = a.type === "ASSET" || a.type === "EXPENSE";
    const v = Number(values[a.id]) || 0;
    return sum + (!isDebitNormal ? v : 0);
  }, 0);
  const diff = totalDebit - totalCredit;

  async function save() {
    setSaving(true);
    setError("");
    setSuccess(false);
    const balances = Object.entries(values)
      .filter(([, v]) => Number(v) > 0)
      .map(([accountId, v]) => ({ accountId, amount: Number(v) }));

    const res = await fetch("/api/accounting/opening-balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, balances }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر حفظ الأرصدة الافتتاحية");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
        💡 استخدم هذي الشاشة مرة وحدة عند بداية استخدام النظام لتسجيل أرصدة حساباتك الحالية (رصيد بنك، ذمم عملاء سابقة...). حفظها مرة ثانية يستبدل الأرصدة السابقة بالكامل.
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الأرصدة الافتتاحية</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">الرقم</th>
              <th className="text-right px-5 py-3 font-medium">الحساب</th>
              <th className="text-right px-5 py-3 font-medium">النوع</th>
              <th className="text-right px-5 py-3 font-medium">الرصيد الافتتاحي</th>
            </tr>
          </thead>
          <tbody>
            {detailAccounts.map((a) => (
              <tr key={a.id} className="border-t border-gray-50">
                <td className="px-5 py-3 text-gray-500 font-mono">{a.code}</td>
                <td className="px-5 py-3 text-ink">{a.name}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeColors[a.type]}`}>{typeLabels[a.type]}</span>
                </td>
                <td className="px-5 py-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={values[a.id] ?? ""}
                    onChange={(e) => updateValue(a.id, e.target.value)}
                    placeholder="0"
                    className="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between text-sm">
        <span>مدين: {totalDebit.toLocaleString()}</span>
        <span>دائن: {totalCredit.toLocaleString()}</span>
        <span className="text-gray-500">الفرق (يُرحّل تلقائياً لحساب الأرصدة الافتتاحية بحقوق الملكية): {diff.toLocaleString()}</span>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-primary-700 bg-primary-50 rounded-lg px-3 py-2">✅ تم حفظ الأرصدة الافتتاحية بنجاح.</p>}

      <button
        onClick={save}
        disabled={saving}
        className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "جاري الحفظ..." : "حفظ الأرصدة الافتتاحية"}
      </button>
    </div>
  );
}

function PeriodLockTab({ periodLock }: { periodLock: { id: string; lockedUntil: string; lockedByName: string } | null }) {
  const router = useRouter();
  const [date, setDate] = useState(periodLock ? periodLock.lockedUntil.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveLock() {
    if (!date) return;
    if (!confirm(`متأكد تبي تقفل كل القيود بتاريخ ${date} وما قبله؟ ما حد يقدر يعدّل أو يحذف أي قيد بهذي الفترة بعد كذا.`)) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/accounting/period-lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockedUntil: date }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إقفال الفترة");
      return;
    }
    router.refresh();
  }

  async function removeLock() {
    if (!confirm("متأكد تبي تلغي الإقفال بالكامل؟ راح يصير كل القيود قابلة للتعديل والحذف من جديد.")) return;
    setSaving(true);
    const res = await fetch("/api/accounting/period-lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockedUntil: null }),
    });
    setSaving(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
        💡 بعد إقفال فترة، ما حد يقدر (ولا حتى الشريك) يضيف أو يعدّل أو يحذف أي قيد أو فاتورة أو مصروف بتاريخ يقع ضمن الفترة المقفلة. هذا يحمي بياناتك المالية بعد المراجعة والاعتماد النهائي.
      </div>

      {periodLock ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">الفترة مقفلة حالياً حتى</p>
          <p className="text-2xl font-bold text-red-600 mb-2">
            {new Date(periodLock.lockedUntil).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p className="text-xs text-gray-400 mb-4">بواسطة: {periodLock.lockedByName}</p>
          <button
            onClick={removeLock}
            disabled={saving}
            className="text-sm text-red-600 hover:underline disabled:opacity-60"
          >
            إلغاء الإقفال بالكامل
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">لا يوجد إقفال حالياً — كل الفترات مفتوحة للتعديل.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {periodLock ? "تحديث تاريخ الإقفال" : "أقفل كل القيود حتى تاريخ"}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <button
            onClick={saveLock}
            disabled={saving || !date}
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "جاري الإقفال..." : "🔒 إقفال الفترة"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (accountId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = accounts.find((a) => a.id === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q
    ? accounts.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0, 30)
    : accounts.slice(0, 30);

  return (
    <div className="relative flex-1" ref={boxRef}>
      <input
        value={open ? query : selected ? `${selected.code} — ${selected.name}` : ""}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        placeholder="اكتب رقم أو اسم الحساب..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {matches.map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => {
                onChange(a.id);
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
            >
              <span className="text-gray-700">{a.name}</span>
              <span className="text-gray-400 font-mono text-xs">{a.code}</span>
            </button>
          ))}
          {matches.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">لا توجد نتائج</p>}
        </div>
      )}
    </div>
  );
}

function RecurringEntriesTab({
  accounts,
  templates,
}: {
  accounts: Account[];
  templates: {
    id: string;
    description: string;
    dayOfMonth: number;
    isActive: boolean;
    lastPostedYear: number | null;
    lastPostedMonth: number | null;
    lines: { id: string; debit: number; credit: number; account: Account }[];
  }[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [lines, setLines] = useState([
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDayOfMonth, setEditDayOfMonth] = useState("1");
  const [editLines, setEditLines] = useState<{ accountId: string; debit: string; credit: string }[]>([]);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  function startEditTemplate(t: (typeof templates)[number]) {
    setEditingId(t.id);
    setEditDescription(t.description);
    setEditDayOfMonth(String(t.dayOfMonth));
    setEditLines(t.lines.map((l) => ({ accountId: l.account.id, debit: l.debit ? String(l.debit) : "", credit: l.credit ? String(l.credit) : "" })));
    setEditError("");
  }
  function updateEditLine(i: number, field: "accountId" | "debit" | "credit", value: string) {
    setEditLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }
  function addEditLine() {
    setEditLines((ls) => [...ls, { accountId: "", debit: "", credit: "" }]);
  }
  function removeEditLine(i: number) {
    setEditLines((ls) => ls.filter((_, idx) => idx !== i));
  }
  async function saveEditTemplate(id: string) {
    const totalDebit = editLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = editLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100) || totalDebit === 0) {
      setEditError("القيد غير متوازن — مجموع المدين لازم يساوي مجموع الدائن");
      return;
    }
    setEditSaving(true);
    setEditError("");
    const res = await fetch(`/api/accounting/recurring-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: editDescription,
        dayOfMonth: Number(editDayOfMonth),
        lines: editLines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error || "تعذر حفظ التعديلات");
      return;
    }
    setEditingId(null);
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
    const res = await fetch("/api/accounting/recurring-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        dayOfMonth: Number(dayOfMonth),
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إنشاء القيد المتكرر");
      return;
    }
    setDescription("");
    setDayOfMonth("1");
    setLines([{ accountId: "", debit: "", credit: "" }, { accountId: "", debit: "", credit: "" }]);
    setShowForm(false);
    router.refresh();
  }

  async function postNow(id: string) {
    if (!confirm("متأكد تبي ترحّل هذا القيد لهذا الشهر؟")) return;
    setPostingId(id);
    const res = await fetch(`/api/accounting/recurring-entries/${id}/post`, { method: "POST" });
    setPostingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذر ترحيل القيد");
      return;
    }
    router.refresh();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("متأكد تبي تحذف هذا القيد المتكرر؟ القيود اللي رُحّلت سابقاً منه ما تتأثر.")) return;
    const res = await fetch(`/api/accounting/recurring-entries/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  const now = new Date();
  function isPostedThisMonth(t: (typeof templates)[number]) {
    return t.lastPostedYear === now.getFullYear() && t.lastPostedMonth === now.getMonth() + 1;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          {showForm ? "إلغاء" : "+ قيد متكرر جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف القيد (مثال: إيجار المكتب)"
              className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1">يوم الترحيل من كل شهر</label>
              <input
                type="number"
                min="1"
                max="28"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <AccountPicker accounts={accounts} value={l.accountId} onChange={(id) => updateLine(i, "accountId", id)} />
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
            {saving ? "جاري الحفظ..." : "حفظ القيد المتكرر"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {templates.map((t) => {
          const posted = isPostedThisMonth(t);
          return (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-ink">{t.description}</p>
                  <p className="text-xs text-gray-400">يوم {t.dayOfMonth} من كل شهر</p>
                </div>
                <div className="flex items-center gap-3">
                  {posted ? (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-primary-50 text-primary-700">تم الترحيل هذا الشهر ✓</span>
                  ) : (
                    <button
                      onClick={() => postNow(t.id)}
                      disabled={postingId === t.id}
                      className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 disabled:opacity-60"
                    >
                      {postingId === t.id ? "..." : "ترحيل الآن لهذا الشهر"}
                    </button>
                  )}
                  <button onClick={() => startEditTemplate(t)} className="text-xs text-gray-500 hover:underline">تعديل</button>
                  <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-600 hover:underline">حذف</button>
                </div>
              </div>
              {editingId === t.id ? (
                <div className="mt-2 space-y-2 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={editDescription}
                      onChange={(ev) => setEditDescription(ev.target.value)}
                      className="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={editDayOfMonth}
                      onChange={(ev) => setEditDayOfMonth(ev.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  {editLines.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <AccountPicker accounts={accounts} value={l.accountId} onChange={(id) => updateEditLine(i, "accountId", id)} />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.debit}
                        onChange={(ev) => updateEditLine(i, "debit", ev.target.value)}
                        placeholder="مدين"
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.credit}
                        onChange={(ev) => updateEditLine(i, "credit", ev.target.value)}
                        placeholder="دائن"
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      {editLines.length > 2 && (
                        <button type="button" onClick={() => removeEditLine(i)} className="text-red-500 text-sm px-1">✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addEditLine} className="text-xs text-primary-700 hover:underline">+ إضافة سطر</button>
                  {editError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">{editError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEditTemplate(t.id)}
                      disabled={editSaving}
                      className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 disabled:opacity-60"
                    >
                      {editSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
                  </div>
                </div>
              ) : (
                <table className="w-full text-xs mt-2">
                  <tbody>
                    {t.lines.map((l) => (
                      <tr key={l.id} className="border-t border-gray-50">
                        <td className="py-1.5 text-gray-700">{l.account.code} — {l.account.name}</td>
                        <td className="py-1.5 text-gray-600">{l.debit > 0 ? `مدين ${l.debit.toLocaleString()}` : ""}</td>
                        <td className="py-1.5 text-gray-600">{l.credit > 0 ? `دائن ${l.credit.toLocaleString()}` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        {templates.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">لا توجد قيود متكررة بعد.</p>
        )}
      </div>
    </div>
  );
}

type StatementLine = { id: string; date: string; description: string; amount: number; matched: boolean; matchedLineId: string | null };
type RecJournalLine = { id: string; debit: number; credit: number; description: string | null; journalEntry: { entryNumber: string; date: string; description: string } };

function ReconciliationTab({ accounts }: { accounts: Account[] }) {
  const bankAccounts = accounts.filter((a) => a.code.startsWith("10") && a.code !== "1100");
  const [accountId, setAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [journalLines, setJournalLines] = useState<RecJournalLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", amount: "" });
  const [autoMatching, setAutoMatching] = useState(false);
  const [records, setRecords] = useState<{ id: string; reconciledDate: string; bookBalance: number; bankBalance: number; difference: number; notes: string | null; createdBy: { name: string } | null }[]>([]);
  const [saveForm, setSaveForm] = useState({ date: new Date().toISOString().slice(0, 10), bankBalance: "", notes: "" });
  const [savingRecord, setSavingRecord] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function loadRecords() {
    if (!accountId) return;
    const res = await fetch(`/api/accounting/reconciliation/save?accountId=${accountId}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
  }

  async function saveReconciliation() {
    if (!saveForm.bankBalance) return;
    setSavingRecord(true);
    setSaveError("");
    const res = await fetch("/api/accounting/reconciliation/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        reconciledDate: saveForm.date,
        bankBalance: Number(saveForm.bankBalance),
        notes: saveForm.notes,
      }),
    });
    setSavingRecord(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error || "تعذر حفظ ملخص المطابقة");
      return;
    }
    setSaveForm({ date: new Date().toISOString().slice(0, 10), bankBalance: "", notes: "" });
    loadRecords();
  }

  async function load() {
    if (!accountId) return;
    setLoading(true);
    const res = await fetch(`/api/accounting/reconciliation?accountId=${accountId}`);
    const data = await res.json();
    setStatementLines(data.statementLines ?? []);
    setJournalLines(data.journalLines ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  async function addLine(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !accountId) return;
    await fetch("/api/accounting/reconciliation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, lines: [{ date: form.date, description: form.description, amount: Number(form.amount) }] }),
    });
    setForm({ date: new Date().toISOString().slice(0, 10), description: "", amount: "" });
    load();
  }

  async function deleteLine(id: string) {
    await fetch(`/api/accounting/reconciliation/lines/${id}`, { method: "DELETE" });
    load();
  }

  async function autoMatch() {
    setAutoMatching(true);
    const res = await fetch("/api/accounting/reconciliation/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auto", accountId }),
    });
    setAutoMatching(false);
    if (res.ok) {
      const data = await res.json();
      alert(`تمت مطابقة ${data.matchedCount} حركة تلقائياً`);
      load();
    }
  }

  async function manualMatch(statementLineId: string, journalLineId: string | null) {
    await fetch("/api/accounting/reconciliation/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statementLineId, journalLineId }),
    });
    load();
  }

  const matchedJournalLineIds = new Set(statementLines.filter((s) => s.matched).map((s) => s.matchedLineId));
  const unmatchedJournalLines = journalLines.filter((j) => !matchedJournalLineIds.has(j.id));
  const matchedCount = statementLines.filter((s) => s.matched).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">الحساب (بنك/صندوق)</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">حركات مطابقة</p>
          <p className="text-xl font-bold text-primary-700">{matchedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">حركات كشف بدون مطابقة</p>
          <p className="text-xl font-bold text-amber-600">{statementLines.filter((s) => !s.matched).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">حركات دفتر بدون مطابقة</p>
          <p className="text-xl font-bold text-amber-600">{unmatchedJournalLines.length}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={autoMatch}
          disabled={autoMatching}
          className="text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {autoMatching ? "جاري المطابقة..." : "⚡ مطابقة تلقائية بالمبلغ"}
        </button>
      </div>

      <form onSubmit={addLine} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">التاريخ</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">الوصف</label>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="وصف حركة كشف الحساب" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">المبلغ (موجب إيداع، سالب سحب)</label>
          <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
          + إضافة حركة كشف
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-6">جاري التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">حركات كشف الحساب البنكي</div>
            <table className="w-full text-xs">
              <tbody>
                {statementLines.map((s) => (
                  <tr key={s.id} className={`border-t border-gray-50 ${s.matched ? "bg-primary-50/30" : ""}`}>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(s.date).toLocaleDateString("ar-SA")}</td>
                    <td className="px-4 py-2 text-ink">{s.description}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{s.amount.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {s.matched ? (
                        <button onClick={() => manualMatch(s.id, null)} className="text-primary-700 hover:underline">✓ مطابق</button>
                      ) : (
                        <select
                          onChange={(e) => e.target.value && manualMatch(s.id, e.target.value)}
                          defaultValue=""
                          className="text-xs rounded border border-gray-300 px-1 py-0.5"
                        >
                          <option value="">مطابقة يدوية</option>
                          {unmatchedJournalLines.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.journalEntry.entryNumber} ({(j.debit || -j.credit).toLocaleString()})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => deleteLine(s.id)} className="text-red-500 hover:underline">✕</button>
                    </td>
                  </tr>
                ))}
                {statementLines.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">لا توجد حركات كشف مضافة بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">حركات دفتر الأستاذ (غير مطابقة)</div>
            <table className="w-full text-xs">
              <tbody>
                {unmatchedJournalLines.map((j) => (
                  <tr key={j.id} className="border-t border-gray-50">
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(j.journalEntry.date).toLocaleDateString("ar-SA")}</td>
                    <td className="px-4 py-2 text-ink">{j.description || j.journalEntry.description}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{(j.debit > 0 ? j.debit : -j.credit).toLocaleString()}</td>
                  </tr>
                ))}
                {unmatchedJournalLines.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">كل حركات الدفتر مطابقة 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-ink mb-1">حفظ ملخص المطابقة</h3>
        <p className="text-xs text-gray-400 mb-3">بعد ما تخلص المطابقة، احفظها كسجل رسمي دائم — يحسب رصيد الدفتر تلقائياً، وتدخل أنت رصيد كشف البنك.</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">تاريخ المطابقة</label>
            <input
              type="date"
              value={saveForm.date}
              onChange={(e) => setSaveForm((f) => ({ ...f, date: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">الرصيد حسب كشف البنك</label>
            <input
              type="number"
              step="0.01"
              value={saveForm.bankBalance}
              onChange={(e) => setSaveForm((f) => ({ ...f, bankBalance: e.target.value }))}
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">ملاحظات (اختياري)</label>
            <input
              value={saveForm.notes}
              onChange={(e) => setSaveForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={saveReconciliation}
            disabled={savingRecord || !saveForm.bankBalance}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {savingRecord ? "جاري الحفظ..." : "💾 حفظ ملخص المطابقة"}
          </button>
        </div>
        {saveError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">{saveError}</p>}
      </div>

      {records.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">سجل المطابقات المحفوظة</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-4 py-2 font-medium">التاريخ</th>
                <th className="text-right px-4 py-2 font-medium">رصيد الدفتر</th>
                <th className="text-right px-4 py-2 font-medium">رصيد البنك</th>
                <th className="text-right px-4 py-2 font-medium">الفرق</th>
                <th className="text-right px-4 py-2 font-medium">بواسطة</th>
                <th className="text-right px-4 py-2 font-medium">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-gray-50">
                  <td className="px-4 py-2 text-gray-600">{new Date(r.reconciledDate).toLocaleDateString("ar-SA")}</td>
                  <td className="px-4 py-2 text-gray-700">{r.bookBalance.toLocaleString()}</td>
                  <td className="px-4 py-2 text-gray-700">{r.bankBalance.toLocaleString()}</td>
                  <td className={`px-4 py-2 font-medium ${Math.abs(r.difference) < 0.01 ? "text-primary-700" : "text-red-600"}`}>
                    {r.difference.toLocaleString()} {Math.abs(r.difference) < 0.01 && "✓"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{r.createdBy?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AttachmentUpload({
  uploadUrl,
  existingUrl,
  existingName,
  onUploaded,
}: {
  uploadUrl: string;
  existingUrl: string | null;
  existingName: string | null;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(uploadUrl, { method: "POST", body: formData });
    setUploading(false);
    e.target.value = "";
    if (res.ok) onUploaded();
    else alert("تعذر رفع الملف");
  }

  if (existingUrl) {
    return (
      <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-700 hover:underline">
        📎 {existingName}
      </a>
    );
  }

  return (
    <label className="text-xs text-gray-400 hover:text-primary-700 hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>
      {uploading ? "جاري الرفع..." : "📎 إرفاق مستند"}
      <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
    </label>
  );
}
