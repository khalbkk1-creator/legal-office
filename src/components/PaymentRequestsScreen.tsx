"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Payee = { id: string; name: string; type: string; phone: string | null };
type Category = { id: string; name: string };
type CaseItem = { id: string; caseNumber: string; title: string };
type Account = { id: string; code: string; name: string };

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
  financeNote: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  closedAt: string | null;
  createdAt: string;
  payee: Payee;
  category: Category | null;
  case: { id: string; caseNumber: string } | null;
  requestedBy: { id: string; name: string; managerId: string | null };
  managerApprovedBy: { name: string } | null;
  financeApprovedBy: { name: string } | null;
  rejectedBy: { name: string } | null;
  closedBy: { name: string } | null;
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING_MANAGER: { label: "بانتظار اعتماد المدير", color: "bg-amber-50 text-amber-700" },
  PENDING_FINANCE: { label: "بانتظار اعتماد المالية", color: "bg-purple-50 text-purple-700" },
  APPROVED: { label: "معتمد — بانتظار الصرف", color: "bg-blue-50 text-blue-700" },
  PAID: { label: "تم الصرف — بانتظار الفاتورة", color: "bg-orange-50 text-orange-700" },
  CLOSED: { label: "مُقفلة", color: "bg-primary-50 text-primary-700" },
  REJECTED: { label: "مرفوض", color: "bg-red-50 text-red-600" },
};

export default function PaymentRequestsScreen({
  currentUserId,
  currentUserRole,
  requests,
  payees,
  categories,
  cases,
  accounts,
}: {
  currentUserId: string;
  currentUserRole: string;
  requests: PaymentRequest[];
  payees: Payee[];
  categories: Category[];
  cases: CaseItem[];
  accounts: Account[];
  allUsers: { id: string; name: string; managerId: string | null }[];
}) {
  const [tab, setTab] = useState<"mine" | "pending" | "all">("pending");

  const isPartner = currentUserRole === "PARTNER";

  function needsMyApproval(r: PaymentRequest) {
    if (r.status === "PENDING_MANAGER") {
      return r.requestedBy.managerId === currentUserId || isPartner;
    }
    if (r.status === "PENDING_FINANCE") return isPartner;
    if (r.status === "APPROVED") return isPartner;
    if (r.status === "PAID" && r.invoiceUrl && isPartner) return true;
    return false;
  }

  const mine = requests.filter((r) => r.requestedBy.id === currentUserId);
  const pending = requests.filter(needsMyApproval);

  const shown = tab === "mine" ? mine : tab === "pending" ? pending : requests;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">طلبات الصرف</h1>
            <p className="text-gray-500 text-sm mt-1">إنشاء ومتابعة طلبات الصرف واعتماداتها</p>
          </div>
          <Link href="/payees" className="text-sm text-primary-700 hover:underline">
            📇 قاعدة بيانات المستفيدين
          </Link>
        </div>
      </div>

      <NewRequestForm payees={payees} categories={categories} cases={cases} />

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "pending" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          بانتظار اعتمادي {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "mine" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          طلباتي
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            tab === "all" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          الكل
        </button>
      </div>

      <div className="space-y-3">
        {shown.map((r) => (
          <RequestCard key={r.id} r={r} canAct={needsMyApproval(r)} accounts={accounts} currentUserId={currentUserId} />
        ))}
        {shown.length === 0 && <p className="text-sm text-gray-400 text-center py-10">لا توجد طلبات هنا.</p>}
      </div>
    </div>
  );
}

function NewRequestForm({ payees, categories, cases }: { payees: Payee[]; categories: Category[]; cases: CaseItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", vatAmount: "", payeeId: "", categoryId: "", caseId: "" });
  const [newPayee, setNewPayee] = useState({ show: false, name: "", type: "INDIVIDUAL", phone: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("إرفاق مستند مؤيد للطلب إلزامي حسب السياسة");
      return;
    }
    setSaving(true);
    setError("");

    let payeeId = form.payeeId;
    if (newPayee.show) {
      const createdId = await createPayeeInline();
      if (!createdId) {
        setSaving(false);
        setError("تعذر إنشاء المستفيد الجديد");
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
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ر.س) *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">ضريبة القيمة المضافة (اختياري)</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">الجهة/الشخص المستفيد من الصرف *</label>
        {!newPayee.show ? (
          <div className="flex items-center gap-2">
            <select
              value={form.payeeId}
              onChange={(e) => update("payeeId", e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">اختر مستفيد</option>
              {payees.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNewPayee((n) => ({ ...n, show: true }))}
              className="text-xs text-primary-700 hover:underline whitespace-nowrap"
            >
              + مستفيد جديد
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">إضافة مستفيد جديد</span>
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

function RequestCard({ r, canAct, accounts, currentUserId }: { r: PaymentRequest; canAct: boolean; accounts: Account[]; currentUserId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id ?? "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  async function approve() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/payment-requests/${r.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر الاعتماد");
      return;
    }
    router.refresh();
  }

  async function reject() {
    if (!rejectReason.trim()) {
      setError("سبب الرفض مطلوب");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/payment-requests/${r.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر الرفض");
      return;
    }
    router.refresh();
  }

  async function pay() {
    if (!payAccountId) {
      setError("حدد الحساب المصروف منه");
      return;
    }
    setBusy(true);
    setError("");
    const formData = new FormData();
    formData.append("paymentAccountId", payAccountId);
    if (proofFile) formData.append("file", proofFile);
    const res = await fetch(`/api/payment-requests/${r.id}/pay`, { method: "POST", body: formData });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر تنفيذ الصرف");
      return;
    }
    router.refresh();
  }

  async function uploadInvoice() {
    if (!invoiceFile) return;
    setBusy(true);
    setError("");
    const formData = new FormData();
    formData.append("file", invoiceFile);
    const res = await fetch(`/api/payment-requests/${r.id}/invoice`, { method: "POST", body: formData });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر رفع الفاتورة");
      return;
    }
    setInvoiceFile(null);
    router.refresh();
  }

  async function closeRequest() {
    if (!confirm("متأكد تبي تقفل الفاتورة؟ راح يترحّل قيد المصروف الفعلي ويُقفل حساب المستفيد.")) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/payment-requests/${r.id}/close`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر إقفال الفاتورة");
      return;
    }
    router.refresh();
  }

  const total = r.amount;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <p className="font-bold text-ink">{r.requestNumber} — {r.payee.name}</p>
          <p className="text-sm text-gray-600 mt-0.5">{r.description}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${statusLabels[r.status].color}`}>
          {statusLabels[r.status].label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="font-bold text-ink text-sm">{total.toLocaleString()} ر.س</span>
        {r.category && <span>· {r.category.name}</span>}
        {r.case && <span>· <Link href={`/cases/${r.case.id}`} className="text-primary-700 hover:underline">{r.case.caseNumber}</Link></span>}
        <span>· بواسطة {r.requestedBy.name}</span>
        <span>· {new Date(r.createdAt).toLocaleDateString("ar-SA")}</span>
        <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline">📎 {r.attachmentName}</a>
      </div>

      {r.managerApprovedBy && (
        <p className="text-xs text-gray-400 mb-1">✓ اعتمد المدير: {r.managerApprovedBy.name}{r.managerNote && ` — ${r.managerNote}`}</p>
      )}
      {r.financeApprovedBy && (
        <p className="text-xs text-gray-400 mb-1">✓ اعتمدت المالية: {r.financeApprovedBy.name}{r.financeNote && ` — ${r.financeNote}`}</p>
      )}
      {r.rejectedBy && (
        <p className="text-xs text-red-600 mb-1">✗ رفض: {r.rejectedBy.name} — {r.rejectionReason}</p>
      )}
      {r.status === "PAID" && (
        <p className="text-xs text-orange-700 mb-1">
          💰 تم الصرف بتاريخ {r.paidAt && new Date(r.paidAt).toLocaleDateString("ar-SA")}
          {r.transferProofUrl && (
            <> — <a href={r.transferProofUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">إثبات التحويل 📎</a></>
          )}
        </p>
      )}
      {r.invoiceUrl && (
        <p className="text-xs text-gray-500 mb-1">
          🧾 فاتورة المورد: <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline">{r.invoiceName}</a>
        </p>
      )}
      {r.status === "CLOSED" && (
        <p className="text-xs text-primary-700 mb-1">
          ✅ أُقفلت بواسطة {r.closedBy?.name} بتاريخ {r.closedAt && new Date(r.closedAt).toLocaleDateString("ar-SA")}
        </p>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1 mt-2">{error}</p>}

      {r.status === "PAID" && !r.invoiceUrl && r.requestedBy.id === currentUserId && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2 bg-amber-50 -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl">
          <p className="text-xs text-amber-800 font-medium">📩 مطلوب منك إرفاق فاتورة المورد لإقفال الطلب</p>
          <div className="flex items-center gap-2">
            <input type="file" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} className="text-xs flex-1" />
            <button onClick={uploadInvoice} disabled={busy || !invoiceFile} className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60">
              {busy ? "..." : "رفع الفاتورة"}
            </button>
          </div>
        </div>
      )}

      {canAct && r.status === "PAID" && r.invoiceUrl && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <button onClick={closeRequest} disabled={busy} className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60">
            {busy ? "..." : "✅ إقفال الفاتورة وترحيل المصروف"}
          </button>
        </div>
      )}

      {canAct && (r.status === "PENDING_MANAGER" || r.status === "PENDING_FINANCE") && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
          {!rejecting ? (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظة (اختياري)"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <div className="flex items-center gap-2">
                <button onClick={approve} disabled={busy} className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60">
                  {busy ? "..." : "✓ اعتماد"}
                </button>
                <button onClick={() => setRejecting(true)} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-4 py-2">
                  رفض
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب الرفض *"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <div className="flex items-center gap-2">
                <button onClick={reject} disabled={busy} className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 disabled:opacity-60">
                  {busy ? "..." : "تأكيد الرفض"}
                </button>
                <button onClick={() => setRejecting(false)} className="text-xs text-gray-400 hover:underline">إلغاء</button>
              </div>
            </>
          )}
        </div>
      )}

      {canAct && r.status === "APPROVED" && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs text-gray-500">رفع التحويل وتنفيذ الصرف</p>
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
            <button onClick={pay} disabled={busy} className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60">
              {busy ? "..." : "💰 تنفيذ الصرف"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
