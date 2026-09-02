"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Payee = { id: string; name: string; type: string; phone: string | null; accountId?: string };
type Category = { id: string; name: string };
type CaseItem = { id: string; caseNumber: string; title: string };
type Account = { id: string; code: string; name: string };
type JournalRef = { id: string; entryNumber: string; date: string; description?: string };
type AcctAccount = { id: string; code: string; name: string; type?: string };
type Activity = { id: string; userId: string; userName: string; action: string; stage: string | null; note: string | null; createdAt: string };

type PaymentRequest = {
  id: string;
  requestNumber: string;
  description: string;
  amount: number;
  vatAmount: number;
  status: string;
  needsManagerApproval: boolean;
  attachmentUrl: string;
  attachmentName: string;
  transferProofUrl: string | null;
  transferProofName: string | null;
  invoiceUrl: string | null;
  invoiceName: string | null;
  managerNote: string | null;
  accountantNote: string | null;
  financeNote: string | null;
  rejectionReason: string | null;
  returnReason: string | null;
  returnedBy: { name: string } | null;
  categoryId?: string | null;
  paidAt: string | null;
  closedAt: string | null;
  createdAt: string;
  payee: Payee;
  category: Category | null;
  case: { id: string; caseNumber: string } | null;
  requestedBy: { id: string; name: string; managerId: string | null };
  managerApprovedBy: { name: string } | null;
  accountantApprovedBy: { name: string } | null;
  financeApprovedBy: { name: string } | null;
  rejectedBy: { name: string } | null;
  closedBy: { name: string } | null;
  activities: Activity[];
  journal: { payment: JournalRef | null; closing: JournalRef | null; adjustments: JournalRef[] };
};

const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  PENDING_MANAGER: { label: "بانتظار المدير", color: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  PENDING_ACCOUNTANT: { label: "بانتظار المحاسب", color: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  PENDING_FINANCE: { label: "بانتظار المدير المالي", color: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  APPROVED: { label: "معتمد — بانتظار الصرف", color: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  PAID: { label: "مصروف — بانتظار الفاتورة", color: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  CLOSED: { label: "مُقفل", color: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
  RETURNED: { label: "مُرجع للتعديل", color: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  REJECTED: { label: "مرفوض", color: "bg-red-50 text-red-600", dot: "bg-red-500" },
};

const STAGES = [
  { key: "MANAGER", label: "المدير" },
  { key: "ACCOUNTANT", label: "المحاسب" },
  { key: "FINANCE", label: "المدير المالي" },
  { key: "PAY", label: "الصرف" },
  { key: "INVOICE", label: "الفاتورة" },
  { key: "CLOSE", label: "الإقفال" },
];

function stageIndex(r: PaymentRequest): number {
  switch (r.status) {
    case "PENDING_MANAGER": return 0;
    case "PENDING_ACCOUNTANT": return 1;
    case "PENDING_FINANCE": return 2;
    case "APPROVED": return 3;
    case "PAID": return r.invoiceUrl ? 5 : 4;
    case "CLOSED": return 6;
    default: return -1;
  }
}

const activityMeta: Record<string, { label: (a: Activity) => string; tone: string }> = {
  CREATED: { label: () => "أنشأ الطلب", tone: "bg-gray-100 text-gray-600" },
  APPROVED: { label: (a) => `اعتمد كـ${a.stage === "MANAGER" ? "مدير" : a.stage === "ACCOUNTANT" ? "محاسب" : "مدير مالي"}`, tone: "bg-primary-50 text-primary-700" },
  REJECTED: { label: () => "رفض الطلب", tone: "bg-red-50 text-red-600" },
  PAID: { label: () => "نفّذ الصرف", tone: "bg-blue-50 text-blue-700" },
  INVOICE_UPLOADED: { label: () => "أرفق فاتورة المورد", tone: "bg-orange-50 text-orange-700" },
  CLOSED: { label: () => "أقفل الطلب ورحّل المصروف", tone: "bg-primary-50 text-primary-700" },
  ADJUSTED: { label: () => "قيد تسوية", tone: "bg-purple-50 text-purple-700" },
  RETURNED: { label: () => "أرجع الطلب للتعديل", tone: "bg-rose-50 text-rose-700" },
  RESUBMITTED: { label: () => "أعاد تقديم الطلب", tone: "bg-blue-50 text-blue-700" },
  COMMENT: { label: () => "", tone: "" },
};

export default function PaymentRequestsScreen({
  currentUserId,
  currentUserRole,
  currentUserIsAccountant,
  currentUserIsFinancialManager,
  requests,
  payees,
  categories,
  cases,
  accounts,
  expenseAccounts,
  allAccounts,
}: {
  currentUserId: string;
  currentUserRole: string;
  currentUserIsAccountant: boolean;
  currentUserIsFinancialManager: boolean;
  requests: PaymentRequest[];
  payees: Payee[];
  categories: Category[];
  cases: CaseItem[];
  accounts: Account[];
  expenseAccounts: AcctAccount[];
  allAccounts: AcctAccount[];
}) {
  const isAccountantLike = currentUserIsAccountant || currentUserRole === "PARTNER";
  const [tab, setTab] = useState<"pending" | "mine" | "all">("pending");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const isPartner = currentUserRole === "PARTNER";

  function needsMyApproval(r: PaymentRequest) {
    if (r.status === "PENDING_MANAGER") return r.requestedBy.managerId === currentUserId || isPartner;
    if (r.status === "PENDING_ACCOUNTANT") return currentUserIsAccountant || isPartner;
    if (r.status === "PENDING_FINANCE") return currentUserIsFinancialManager || isPartner;
    if (r.status === "APPROVED") return r.requestedBy.id === currentUserId || isPartner;
    if (r.status === "RETURNED" || r.status === "REJECTED") return r.requestedBy.id === currentUserId;
    if (r.status === "PAID" && r.invoiceUrl) return currentUserIsAccountant || isPartner;
    return false;
  }

  const total = (r: PaymentRequest) => r.amount; // المبلغ المخزّن شامل الضريبة
  const mine = requests.filter((r) => r.requestedBy.id === currentUserId);
  const pending = requests.filter(needsMyApproval);
  const approvedAwaitingPay = requests.filter((r) => r.status === "APPROVED");
  const paidAwaitingInvoice = requests.filter((r) => r.status === "PAID" && !r.invoiceUrl);

  const base = tab === "mine" ? mine : tab === "pending" ? pending : requests;
  const ql = q.trim().toLowerCase();
  const shown = base.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (!ql) return true;
    return (
      r.requestNumber.toLowerCase().includes(ql) ||
      r.description.toLowerCase().includes(ql) ||
      r.payee.name.toLowerCase().includes(ql) ||
      r.requestedBy.name.toLowerCase().includes(ql)
    );
  });

  const sum = (list: PaymentRequest[]) => list.reduce((s, r) => s + total(r), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">طلبات الصرف</h1>
          <p className="text-gray-500 text-sm mt-1">{requests.length} طلب · اعتماد متسلسل ثم صرف وإقفال</p>
        </div>
        <Link href="/payees" className="text-sm text-primary-700 hover:underline shrink-0">
          قاعدة الموردين
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Summary label="بانتظار اعتمادي" count={pending.length} amount={sum(pending)} tone={pending.length ? "text-red-600" : "text-ink"} />
        <Summary label="معتمد بانتظار الصرف" count={approvedAwaitingPay.length} amount={sum(approvedAwaitingPay)} tone="text-blue-700" />
        <Summary label="مصروف بانتظار الفاتورة" count={paidAwaitingInvoice.length} amount={sum(paidAwaitingInvoice)} tone="text-orange-700" />
      </div>

      <NewRequestForm payees={payees} categories={categories} cases={cases} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {[
            { k: "pending", l: `بانتظار اعتمادي${pending.length ? ` (${pending.length})` : ""}` },
            { k: "mine", l: "طلباتي" },
            { k: "all", l: "الكل" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                tab === t.k ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث برقم الطلب، الوصف، المورد، أو مقدّم الطلب"
          className="flex-1 min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="ALL">كل الحالات</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {shown.map((r) => (
          <RequestCard key={r.id} r={r} canAct={needsMyApproval(r)} accounts={accounts} currentUserId={currentUserId} expenseAccounts={expenseAccounts} allAccounts={allAccounts} canAdjust={isAccountantLike} categories={categories} />
        ))}
        {shown.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-ink font-medium">{ql || statusFilter !== "ALL" ? "لا توجد طلبات تطابق البحث" : tab === "pending" ? "لا يوجد شيء بانتظارك" : "لا توجد طلبات هنا"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ label, count, amount, tone }: { label: string; count: number; amount: number; tone: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 tabular-nums ${tone}`}>{amount.toLocaleString()} ر.س</p>
      </div>
      <span className={`text-2xl font-bold tabular-nums ${tone}`}>{count}</span>
    </div>
  );
}

function NewRequestForm({ payees, categories, cases }: { payees: Payee[]; categories: Category[]; cases: CaseItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", vatAmount: "", payeeId: "", categoryId: "", caseId: "" });
  const [newPayee, setNewPayee] = useState({ show: false, name: "", type: "INDIVIDUAL", phone: "" });
  const [beneficiaryMode, setBeneficiaryMode] = useState<"supplier" | "client">("supplier");
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<{ id: string; name: string; type: string; phone: string | null }[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [searchingClients, setSearchingClients] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function searchClients(q: string) {
    setClientQuery(q);
    setSelectedClient(null);
    if (q.trim().length < 2) {
      setClientResults([]);
      return;
    }
    setSearchingClients(true);
    const res = await fetch(`/api/clients/search?q=${encodeURIComponent(q)}`);
    setSearchingClients(false);
    if (res.ok) setClientResults(await res.json());
  }

  async function createPayeeInline(): Promise<string | null> {
    if (!newPayee.name.trim()) return null;
    const res = await fetch("/api/payees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPayee.name, type: newPayee.type, phone: newPayee.phone }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id as string;
  }

  async function linkClientAsPayee(): Promise<string | null> {
    if (!selectedClient) return null;
    const res = await fetch("/api/payees/from-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selectedClient.id }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id as string;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("إرفاق مستند مؤيد للطلب إلزامي حسب السياسة");
      return;
    }
    setSaving(true);
    setError("");

    let payeeId = form.payeeId;
    if (beneficiaryMode === "client") {
      const linkedId = await linkClientAsPayee();
      if (!linkedId) {
        setSaving(false);
        setError("حدد العميل المستفيد من الصرف");
        return;
      }
      payeeId = linkedId;
    } else if (newPayee.show) {
      const createdId = await createPayeeInline();
      if (!createdId) {
        setSaving(false);
        setError("تعذر إنشاء المورد الجديد");
        return;
      }
      payeeId = createdId;
    }
    if (!payeeId) {
      setSaving(false);
      setError("حدد المستفيد من الصرف");
      return;
    }

    const formData = new FormData();
    formData.append("description", form.description);
    formData.append("amount", form.amount);
    formData.append("vatAmount", form.vatAmount || "0");
    formData.append("payeeId", payeeId);
    if (form.categoryId) formData.append("categoryId", form.categoryId);
    if (form.caseId) formData.append("caseId", form.caseId);
    formData.append("file", file);

    const res = await fetch("/api/payment-requests", { method: "POST", body: formData });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إنشاء الطلب");
      return;
    }
    setForm({ description: "", amount: "", vatAmount: "", payeeId: "", categoryId: "", caseId: "" });
    setNewPayee({ show: false, name: "", type: "INDIVIDUAL", phone: "" });
    setBeneficiaryMode("supplier");
    setClientQuery("");
    setClientResults([]);
    setSelectedClient(null);
    setFile(null);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition"
      >
        + طلب صرف جديد
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink">طلب صرف جديد</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الوصف *</label>
        <textarea
          required
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={2}
          placeholder="اشرح سبب طلب الصرف..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">إجمالي المبلغ شامل الضريبة (ر.س) *</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">منها ضريبة القيمة المضافة (اختياري)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.vatAmount}
            onChange={(e) => update("vatAmount", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الجهة المستفيدة من الصرف *</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setBeneficiaryMode("supplier")}
            className={`text-xs rounded-lg px-3 py-1.5 border transition ${
              beneficiaryMode === "supplier" ? "border-primary-600 bg-primary-50 text-primary-700 font-medium" : "border-gray-300 text-gray-600"
            }`}
          >
            مورد
          </button>
          <button
            type="button"
            onClick={() => setBeneficiaryMode("client")}
            className={`text-xs rounded-lg px-3 py-1.5 border transition ${
              beneficiaryMode === "client" ? "border-primary-600 bg-primary-50 text-primary-700 font-medium" : "border-gray-300 text-gray-600"
            }`}
          >
            عميل (من قاعدة العملاء)
          </button>
        </div>

        {beneficiaryMode === "client" ? (
          <div className="space-y-2">
            {selectedClient ? (
              <div className="flex items-center justify-between border border-primary-200 bg-primary-50 rounded-lg px-3 py-2">
                <span className="text-sm text-primary-800">{selectedClient.name}</span>
                <button type="button" onClick={() => { setSelectedClient(null); setClientQuery(""); }} className="text-xs text-primary-600 hover:underline">تغيير</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={clientQuery}
                  onChange={(e) => searchClients(e.target.value)}
                  placeholder="اكتب اسم العميل أو جواله للبحث..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {clientQuery.trim().length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {searchingClients && <p className="px-3 py-2 text-xs text-gray-400">جاري البحث...</p>}
                    {!searchingClients && clientResults.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setClientResults([]); }}
                        className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-700">{c.name}</span>
                        {c.phone && <span className="text-gray-400 text-xs" dir="ltr">{c.phone}</span>}
                      </button>
                    ))}
                    {!searchingClients && clientResults.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">لا يوجد عملاء مطابقين</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : !newPayee.show ? (
          <div className="flex items-center gap-2">
            <select
              value={form.payeeId}
              onChange={(e) => update("payeeId", e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">اختر مورد</option>
              {payees.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNewPayee((n) => ({ ...n, show: true }))}
              className="text-xs text-primary-700 hover:underline whitespace-nowrap"
            >
              + مورد جديد
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">إضافة مورد جديد</span>
              <button type="button" onClick={() => setNewPayee({ show: false, name: "", type: "INDIVIDUAL", phone: "" })} className="text-xs text-gray-400 hover:underline">إلغاء</button>
            </div>
            <input
              value={newPayee.name}
              onChange={(e) => setNewPayee((n) => ({ ...n, name: e.target.value }))}
              placeholder="اسم الشخص أو الجهة"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newPayee.type}
                onChange={(e) => setNewPayee((n) => ({ ...n, type: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="INDIVIDUAL">فرد</option>
                <option value="COMPANY">جهة/شركة</option>
              </select>
              <input
                value={newPayee.phone}
                onChange={(e) => setNewPayee((n) => ({ ...n, phone: e.target.value }))}
                placeholder="الجوال (اختياري)"
                dir="ltr"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تصنيف المصروف (اختياري)</label>
          <select
            value={form.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">بدون تصنيف</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">القضية المرتبطة (اختياري)</label>
          <select
            value={form.caseId}
            onChange={(e) => update("caseId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">بدون قضية</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">المستند المؤيد للطلب * (إلزامي)</label>
        <input
          type="file"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "جاري الإرسال..." : "إرسال الطلب"}
      </button>
    </form>
  );
}

function RequestCard({ r, canAct, accounts, currentUserId, expenseAccounts, allAccounts, canAdjust, categories }: { r: PaymentRequest; canAct: boolean; accounts: Account[]; currentUserId: string; expenseAccounts: AcctAccount[]; allAccounts: AcctAccount[]; canAdjust: boolean; categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id ?? "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const defaultExpense = expenseAccounts.find((a) => r.category && a.name === r.category.name)?.id ?? expenseAccounts.find((a) => a.code === "5100")?.id ?? expenseAccounts[0]?.id ?? "";
  const [expenseAccountId, setExpenseAccountId] = useState(defaultExpense);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [rs, setRs] = useState({ description: r.description, amount: String(r.amount), vatAmount: String(r.vatAmount || ""), categoryId: r.categoryId ?? "", note: "" });
  const [rsFile, setRsFile] = useState<File | null>(null);
  const [adjDesc, setAdjDesc] = useState("");
  const [adjLines, setAdjLines] = useState([{ accountId: "", debit: "", credit: "" }, { accountId: "", debit: "", credit: "" }]);
  const [error, setError] = useState("");

  async function post(url: string, init: RequestInit, fallback: string) {
    setBusy(true);
    setError("");
    const res = await fetch(url, init);
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || fallback);
      return false;
    }
    router.refresh();
    return true;
  }

  const approve = () =>
    post(`/api/payment-requests/${r.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) }, "تعذر الاعتماد");

  async function reject() {
    if (!rejectReason.trim()) return setError("سبب الرفض مطلوب");
    await post(`/api/payment-requests/${r.id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: rejectReason }) }, "تعذر الرفض");
  }

  async function returnRequest() {
    if (!returnReason.trim()) return setError("سبب الإرجاع مطلوب");
    await post(`/api/payment-requests/${r.id}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: returnReason }) }, "تعذر الإرجاع");
  }

  async function resubmit() {
    if (!rs.description.trim() || !rs.amount) return setError("الوصف والمبلغ مطلوبان");
    const fd = new FormData();
    fd.append("description", rs.description);
    fd.append("amount", rs.amount);
    fd.append("vatAmount", rs.vatAmount || "0");
    fd.append("categoryId", rs.categoryId);
    fd.append("note", rs.note);
    if (rsFile) fd.append("file", rsFile);
    if (await post(`/api/payment-requests/${r.id}/resubmit`, { method: "POST", body: fd }, "تعذر إعادة التقديم")) setResubmitOpen(false);
  }

  async function pay() {
    if (!payAccountId) return setError("حدد الحساب المصروف منه");
    const fd = new FormData();
    fd.append("paymentAccountId", payAccountId);
    if (proofFile) fd.append("file", proofFile);
    await post(`/api/payment-requests/${r.id}/pay`, { method: "POST", body: fd }, "تعذر تنفيذ الصرف");
  }

  async function uploadInvoice() {
    if (!invoiceFile) return;
    const fd = new FormData();
    fd.append("file", invoiceFile);
    if (await post(`/api/payment-requests/${r.id}/invoice`, { method: "POST", body: fd }, "تعذر رفع الفاتورة")) setInvoiceFile(null);
  }

  async function closeRequest() {
    if (!expenseAccountId) return setError("حدد حساب المصروف");
    if (!confirm("متأكد تبي تقفل الفاتورة؟ راح يترحّل قيد المصروف الفعلي ويُقفل حساب المورد.")) return;
    await post(`/api/payment-requests/${r.id}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenseAccountId }) }, "تعذر إقفال الفاتورة");
  }

  async function submitAdjustment() {
    const lines = adjLines.filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0)).map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 }));
    const d = lines.reduce((x, l) => x + l.debit, 0), c = lines.reduce((x, l) => x + l.credit, 0);
    if (!adjDesc.trim() || lines.length < 2) return setError("اكتب وصف التسوية وسطرين على الأقل");
    if (Math.round(d * 100) !== Math.round(c * 100) || d <= 0) return setError("قيد التسوية غير متوازن");
    if (await post(`/api/payment-requests/${r.id}/adjust`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: adjDesc, lines }) }, "تعذر ترحيل التسوية")) {
      setAdjustOpen(false); setAdjDesc(""); setAdjLines([{ accountId: "", debit: "", credit: "" }, { accountId: "", debit: "", credit: "" }]);
    }
  }

  async function sendComment() {
    const msg = comment.trim();
    if (!msg) return;
    setSendingComment(true);
    setError("");
    const res = await fetch(`/api/payment-requests/${r.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    setSendingComment(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إرسال الرسالة");
      return;
    }
    setComment("");
    router.refresh();
  }

  const total = r.amount; // شامل الضريبة
  const net = r.amount - r.vatAmount;
  const isOwner = r.requestedBy.id === currentUserId;
  const idx = stageIndex(r);
  const isRejected = r.status === "REJECTED";
  const isReturned = r.status === "RETURNED";
  const canResubmit = (isRejected || isReturned) && (isOwner);
  const st = statusLabels[r.status];
  const commentsCount = r.activities.filter((a) => a.action === "COMMENT").length;

  const currentActor =
    r.status === "PENDING_MANAGER" ? "مدير الموظف" :
    r.status === "PENDING_ACCOUNTANT" ? "المحاسب" :
    r.status === "PENDING_FINANCE" ? "المدير المالي" :
    r.status === "APPROVED" ? `${r.requestedBy.name} (تنفيذ الصرف)` :
    r.status === "PAID" && !r.invoiceUrl ? `${r.requestedBy.name} (إرفاق الفاتورة)` :
    r.status === "PAID" ? "المحاسب (الإقفال)" :
    r.status === "RETURNED" ? `${r.requestedBy.name} (التعديل وإعادة التقديم)` : null;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm ${canAct ? "border-primary-200" : "border-gray-100"}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400" dir="ltr">{r.requestNumber}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${st.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
              {canAct && <span className="text-[11px] px-2 py-0.5 rounded-md bg-red-600 text-white font-medium">مطلوب منك</span>}
            </div>
            <p className="font-semibold text-ink mt-1.5">{r.payee.name}</p>
            <p className="text-sm text-gray-600 mt-0.5">{r.description}</p>
          </div>
          <div className="text-left shrink-0">
            <p className="text-xl font-bold text-ink tabular-nums">{total.toLocaleString()} <span className="text-xs font-normal text-gray-400">ر.س</span></p>
            {r.vatAmount > 0 && (
              <p className="text-[11px] text-gray-400 tabular-nums">صافي {net.toLocaleString()} + ضريبة {r.vatAmount.toLocaleString()}</p>
            )}
          </div>
        </div>

        {!isRejected && !isReturned && (
          <div className="mt-4 flex items-center">
            {STAGES.map((s, i) => {
              const done = i < idx;
              const current = i === idx;
              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 ${
                        done ? "bg-primary-600 border-primary-600 text-white" : current ? "bg-white border-primary-600 text-primary-700" : "bg-white border-gray-200 text-gray-300"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 whitespace-nowrap ${current ? "text-primary-700 font-medium" : done ? "text-gray-600" : "text-gray-300"}`}>{s.label}</span>
                  </div>
                  {i < STAGES.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < idx ? "bg-primary-500" : "bg-gray-200"}`} />}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>بواسطة {r.requestedBy.name}</span>
          <span>· {new Date(r.createdAt).toLocaleDateString("ar-SA")}</span>
          {r.category && <span>· {r.category.name}</span>}
          {r.case && <span>· <Link href={`/cases/${r.case.id}`} className="text-primary-700 hover:underline">{r.case.caseNumber}</Link></span>}
          {currentActor && <span className="text-ink">· الآن عند: {currentActor}</span>}
          <button onClick={() => setOpen((o) => !o)} className="mr-auto text-primary-700 hover:underline">
            {open ? "إخفاء التفاصيل" : `التفاصيل والسجل${commentsCount ? ` (${commentsCount} رسالة)` : ""}`}
          </button>
        </div>

        {isRejected && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">رُفض بواسطة {r.rejectedBy?.name}: {r.rejectionReason}</p>
        )}
        {isReturned && (
          <p className="mt-3 text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">أُرجع للتعديل بواسطة {r.returnedBy?.name}: {r.returnReason}</p>
        )}

        {canResubmit && (
          <div className="mt-3">
            {!resubmitOpen ? (
              <button onClick={() => setResubmitOpen(true)} className="text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 font-medium">
                تعديل وإعادة التقديم
              </button>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-500">عدّل ما يلزم ثم أعد التقديم — يرجع الطلب لبداية سلسلة الاعتماد وتُحفظ كل التغييرات بالسجل.</p>
                <input value={rs.description} onChange={(e) => setRs((x) => ({ ...x, description: e.target.value }))} placeholder="الوصف" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" min="0" step="0.01" value={rs.amount} onChange={(e) => setRs((x) => ({ ...x, amount: e.target.value }))} placeholder="الإجمالي شامل الضريبة" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="number" min="0" step="0.01" value={rs.vatAmount} onChange={(e) => setRs((x) => ({ ...x, vatAmount: e.target.value }))} placeholder="منها ضريبة" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <select value={rs.categoryId} onChange={(e) => setRs((x) => ({ ...x, categoryId: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">بدون تصنيف</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-gray-500">استبدال المستند (اختياري)</label>
                  <input type="file" onChange={(e) => setRsFile(e.target.files?.[0] ?? null)} className="text-xs" />
                </div>
                <input value={rs.note} onChange={(e) => setRs((x) => ({ ...x, note: e.target.value }))} placeholder="ملاحظة توضّح ما تم تعديله (اختياري)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <div className="flex items-center gap-2">
                  <button onClick={resubmit} disabled={busy} className="text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2 font-medium disabled:opacity-60">{busy ? "..." : "إعادة التقديم"}</button>
                  <button onClick={() => setResubmitOpen(false)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
      </div>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">المرفقات</p>
            <ul className="space-y-1.5 text-sm">
              <li><a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline">مستند الطلب: {r.attachmentName}</a></li>
              {r.transferProofUrl && <li><a href={r.transferProofUrl} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline">إثبات التحويل: {r.transferProofName}</a></li>}
              {r.invoiceUrl && <li><a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline">فاتورة المورد: {r.invoiceName}</a></li>}
            </ul>

            <p className="text-xs font-semibold text-gray-500 mt-5 mb-2">القيود المحاسبية</p>
            <ul className="space-y-1.5 text-sm">
              <JournalLine label="قيد الصرف" entry={r.journal.payment} pending={r.status !== "CLOSED" && !r.journal.payment ? "يُرحّل تلقائياً عند تنفيذ الصرف" : undefined} />
              <JournalLine label="قيد الإقفال (المصروف)" entry={r.journal.closing} pending={!r.journal.closing ? "يُرحّل تلقائياً عند الإقفال" : undefined} />
              {r.journal.adjustments.map((e) => <JournalLine key={e.id} label="قيد تسوية" entry={e} />)}
            </ul>
            {r.payee.accountId && (
              <Link href={`/accounting/ledger/${r.payee.accountId}`} className="inline-block mt-2 text-xs text-primary-700 hover:underline">دفتر أستاذ المورد ←</Link>
            )}

            {canAdjust && r.status !== "REJECTED" && (
              <div className="mt-4">
                {!adjustOpen ? (
                  <button onClick={() => setAdjustOpen(true)} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-1.5">+ قيد تسوية مرتبط بالطلب</button>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <input value={adjDesc} onChange={(e) => setAdjDesc(e.target.value)} placeholder="وصف التسوية (رسوم بنكية، خصم، فرق سعر…)" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                    {adjLines.map((l, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select value={l.accountId} onChange={(e) => setAdjLines((ls) => ls.map((x, idx) => idx === i ? { ...x, accountId: e.target.value } : x))} className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs">
                          <option value="">اختر حساب</option>
                          {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                        </select>
                        <input type="number" min="0" step="0.01" value={l.debit} onChange={(e) => setAdjLines((ls) => ls.map((x, idx) => idx === i ? { ...x, debit: e.target.value } : x))} placeholder="مدين" className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
                        <input type="number" min="0" step="0.01" value={l.credit} onChange={(e) => setAdjLines((ls) => ls.map((x, idx) => idx === i ? { ...x, credit: e.target.value } : x))} placeholder="دائن" className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAdjLines((ls) => [...ls, { accountId: "", debit: "", credit: "" }])} className="text-xs text-primary-700 hover:underline">+ سطر</button>
                      <button onClick={submitAdjustment} disabled={busy} className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 disabled:opacity-60 mr-auto">{busy ? "..." : "ترحيل التسوية"}</button>
                      <button onClick={() => setAdjustOpen(false)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">سجل الحركات والمحادثة</p>
            <div className="space-y-3 max-h-80 overflow-y-auto pl-1">
              {r.activities.length === 0 && <p className="text-xs text-gray-400">لا توجد حركات مسجّلة.</p>}
              {r.activities.map((a) => {
                const mine = a.userId === currentUserId;
                if (a.action === "COMMENT") {
                  return (
                    <div key={a.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary-700 text-white rounded-tr-sm" : "bg-gray-100 text-ink rounded-tl-sm"}`}>
                        <p className="whitespace-pre-wrap">{a.note}</p>
                        <p className={`text-[10px] mt-1 ${mine ? "text-primary-100" : "text-gray-400"}`}>
                          {a.userName} · {new Date(a.createdAt).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                }
                const meta = activityMeta[a.action];
                return (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${meta?.tone ?? "bg-gray-100 text-gray-600"}`}>{meta ? meta.label(a) : a.action}</span>
                    <div className="min-w-0">
                      <p className="text-gray-700">{a.userName}{a.note && <span className="text-gray-500"> — {a.note}</span>}</p>
                      <p className="text-[10px] text-gray-400">{new Date(a.createdAt).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {r.status !== "CLOSED" && (
              <div className="mt-3 flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  placeholder="اكتب رسالة أو استفسار للفريق…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button onClick={sendComment} disabled={sendingComment || !comment.trim()} className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 disabled:opacity-60">
                  {sendingComment ? "..." : "إرسال"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {r.status === "PAID" && !r.invoiceUrl && isOwner && (
        <div className="border-t border-amber-100 bg-amber-50 px-5 py-4 rounded-b-2xl space-y-2">
          <p className="text-xs text-amber-800 font-medium">مطلوب منك إرفاق فاتورة المورد لإقفال الطلب</p>
          <div className="flex items-center gap-2">
            <input type="file" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} className="text-xs flex-1" />
            <button onClick={uploadInvoice} disabled={busy || !invoiceFile} className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60">
              {busy ? "..." : "رفع الفاتورة"}
            </button>
          </div>
        </div>
      )}

      {canAct && r.status === "PAID" && r.invoiceUrl && (
        <div className="border-t border-primary-100 bg-primary-50/40 px-5 py-4 rounded-b-2xl space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">حساب المصروف الذي سيُحمّل عليه</label>
              <select value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <button onClick={closeRequest} disabled={busy} className="text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2 font-medium disabled:opacity-60">
              {busy ? "..." : "إقفال وترحيل المصروف"}
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-3 text-xs">
            <p className="text-gray-500 mb-1.5">معاينة القيد الذي سيُرحّل:</p>
            <table className="w-full">
              <tbody>
                <tr><td className="py-0.5 text-gray-700">{expenseAccounts.find((a) => a.id === expenseAccountId)?.name ?? "المصروف"}</td><td className="py-0.5 text-left tabular-nums">مدين {net.toLocaleString()}</td></tr>
                {r.vatAmount > 0 && <tr><td className="py-0.5 text-gray-700">ضريبة القيمة المضافة — مدخلات</td><td className="py-0.5 text-left tabular-nums">مدين {r.vatAmount.toLocaleString()}</td></tr>}
                <tr className="border-t border-gray-100"><td className="py-0.5 text-gray-700 pr-4">{r.payee.name}</td><td className="py-0.5 text-left tabular-nums">دائن {total.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canAct && (r.status === "PENDING_MANAGER" || r.status === "PENDING_ACCOUNTANT" || r.status === "PENDING_FINANCE") && (
        <div className="border-t border-primary-100 bg-primary-50/40 px-5 py-4 rounded-b-2xl space-y-2">
          {!rejecting && !returning ? (
            <>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة مع الاعتماد (اختياري)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <div className="flex items-center gap-2">
                <button onClick={approve} disabled={busy} className="text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2 font-medium disabled:opacity-60">
                  {busy ? "..." : "اعتماد"}
                </button>
                <button onClick={() => { setReturning(true); setRejecting(false); }} className="text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-4 py-2">إرجاع للتعديل</button>
                <button onClick={() => { setRejecting(true); setReturning(false); }} className="text-sm bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-lg px-4 py-2">رفض</button>
                <button onClick={() => setOpen(true)} className="text-xs text-gray-500 hover:text-ink mr-auto">عندك استفسار؟ اكتبه بالمحادثة</button>
              </div>
            </>
          ) : returning ? (
            <>
              <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="سبب الإرجاع وما المطلوب تعديله (إلزامي)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <div className="flex items-center gap-2">
                <button onClick={returnRequest} disabled={busy} className="text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-5 py-2 font-medium disabled:opacity-60">{busy ? "..." : "تأكيد الإرجاع"}</button>
                <button onClick={() => setReturning(false)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
              </div>
            </>
          ) : (
            <>
              <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="سبب الرفض (إلزامي)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <div className="flex items-center gap-2">
                <button onClick={reject} disabled={busy} className="text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg px-5 py-2 font-medium disabled:opacity-60">
                  {busy ? "..." : "تأكيد الرفض"}
                </button>
                <button onClick={() => setRejecting(false)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
              </div>
            </>
          )}
        </div>
      )}

      {r.status === "APPROVED" && isOwner && (
        <div className="border-t border-blue-100 bg-blue-50 px-5 py-4 rounded-b-2xl space-y-2">
          <p className="text-xs text-blue-800 font-medium">اكتمل الاعتماد — نفّذ الصرف الآن وارفع إثبات التحويل</p>
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">الحساب المصروف منه</label>
              <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">إثبات التحويل (اختياري)</label>
              <input type="file" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} className="text-xs" />
            </div>
            <button onClick={pay} disabled={busy} className="text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2 font-medium disabled:opacity-60">
              {busy ? "..." : "تنفيذ الصرف"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function JournalLine({ label, entry, pending }: { label: string; entry: JournalRef | null; pending?: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-gray-600">{label}</span>
      {entry ? (
        <span className="text-ink tabular-nums">
          <span className="font-mono text-xs" dir="ltr">{entry.entryNumber}</span>
          <span className="text-gray-400 text-xs"> · {new Date(entry.date).toLocaleDateString("ar-SA")}</span>
        </span>
      ) : (
        <span className="text-xs text-gray-400">{pending ?? "—"}</span>
      )}
    </li>
  );
}
