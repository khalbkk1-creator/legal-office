import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
};

export default async function LedgerPage({ params }: { params: { accountId: string } }) {
  const account = await prisma.account.findUnique({ where: { id: params.accountId } });
  if (!account) notFound();

  const lines = await prisma.journalEntryLine.findMany({
    where: { accountId: params.accountId },
    include: { journalEntry: true },
    orderBy: [{ journalEntry: { date: "asc" } }, { journalEntry: { entryNumber: "asc" } }],
  });

  const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";

  let running = 0;
  const rows = lines.map((l) => {
    running += isDebitNormal ? l.debit - l.credit : l.credit - l.debit;
    return { ...l, runningBalance: running };
  });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <Link href="/accounting" className="text-sm text-primary-700 hover:underline mb-2 inline-block">
            ‹ رجوع للنظام المحاسبي
          </Link>
          <a
            href={`/api/accounting/export-ledger/${account.id}`}
            className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 inline-flex items-center gap-1"
          >
            📊 تصدير Excel
          </a>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{account.code} — {account.name}</h1>
          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeColors[account.type]}`}>
            {typeLabels[account.type]}
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1">دفتر الأستاذ — كل الحركات المؤثرة على هذا الحساب</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">إجمالي المدين</p>
          <p className="text-2xl font-bold text-ink">{totalDebit.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">إجمالي الدائن</p>
          <p className="text-2xl font-bold text-ink">{totalCredit.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">الرصيد الحالي</p>
          <p className={`text-2xl font-bold ${running >= 0 ? "text-primary-700" : "text-red-600"}`}>
            {running.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">التاريخ</th>
              <th className="text-right px-5 py-3 font-medium">رقم القيد</th>
              <th className="text-right px-5 py-3 font-medium">البيان</th>
              <th className="text-right px-5 py-3 font-medium">المصدر</th>
              <th className="text-right px-5 py-3 font-medium">مدين</th>
              <th className="text-right px-5 py-3 font-medium">دائن</th>
              <th className="text-right px-5 py-3 font-medium">الرصيد الجاري</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-50">
                <td className="px-5 py-3 text-gray-600">
                  {new Date(r.journalEntry.date).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                </td>
                <td className="px-5 py-3 text-gray-500 font-mono">{r.journalEntry.entryNumber}</td>
                <td className="px-5 py-3 text-ink">{r.description || r.journalEntry.description}</td>
                <td className="px-5 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                    {r.journalEntry.sourceType ? sourceLabels[r.journalEntry.sourceType] ?? r.journalEntry.sourceType : "—"}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-700">{r.debit > 0 ? r.debit.toLocaleString() : "—"}</td>
                <td className="px-5 py-3 text-gray-700">{r.credit > 0 ? r.credit.toLocaleString() : "—"}</td>
                <td className={`px-5 py-3 font-medium ${r.runningBalance >= 0 ? "text-primary-700" : "text-red-600"}`}>
                  {r.runningBalance.toLocaleString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gray-400">لا توجد حركات على هذا الحساب بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
