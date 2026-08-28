import { prisma } from "@/lib/prisma";
import PrintButton from "../../PrintButton";

export default async function PrintStatementsPage() {
  const [accounts, lineSums, settings] = await Promise.all([
    prisma.account.findMany({ orderBy: { code: "asc" } }),
    prisma.journalEntryLine.groupBy({ by: ["accountId"], where: { journalEntry: { status: "POSTED" } }, _sum: { debit: true, credit: true } }),
    prisma.officeSettings.findFirst(),
  ]);

  const sumsByAccount: Record<string, { debit: number; credit: number }> = {};
  for (const s of lineSums) sumsByAccount[s.accountId] = { debit: s._sum.debit ?? 0, credit: s._sum.credit ?? 0 };

  const rows = accounts
    .filter((a) => sumsByAccount[a.id])
    .map((a) => {
      const sums = sumsByAccount[a.id];
      const isDebitNormal = a.type === "ASSET" || a.type === "EXPENSE";
      const balance = isDebitNormal ? sums.debit - sums.credit : sums.credit - sums.debit;
      return { ...a, balance };
    });

  const revenues = rows.filter((r) => r.type === "REVENUE");
  const expenses = rows.filter((r) => r.type === "EXPENSE");
  const totalRevenue = revenues.reduce((s, r) => s + r.balance, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  const assets = rows.filter((r) => r.type === "ASSET");
  const liabilities = rows.filter((r) => r.type === "LIABILITY");
  const equity = rows.filter((r) => r.type === "EQUITY");
  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquity = equity.reduce((s, r) => s + r.balance, 0);

  const today = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white py-10 px-4" dir="rtl">
      <PrintButton />
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm print:shadow-none border border-gray-100 print:border-0 p-10 space-y-10">
        {(settings?.officeName || settings?.logoUrl) && (
          <div className="flex items-center gap-3 border-b border-gray-100 pb-6">
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="" className="w-14 h-14 object-contain" />
            )}
            <div>
              {settings.officeName && <p className="text-lg font-bold text-ink">{settings.officeName}</p>}
              {settings.taxNumber && <p className="text-xs text-gray-400">الرقم الضريبي: {settings.taxNumber}</p>}
            </div>
          </div>
        )}

        <div>
          <h1 className="text-xl font-bold text-ink mb-1">قائمة الدخل</h1>
          <p className="text-sm text-gray-500 mb-4">حتى تاريخ {today}</p>
          <p className="text-xs font-medium text-gray-500 mb-1">الإيرادات</p>
          {revenues.map((r) => (
            <div key={r.id} className="flex justify-between text-sm py-0.5"><span>{r.name}</span><span>{r.balance.toLocaleString()}</span></div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1 mt-1"><span>إجمالي الإيرادات</span><span>{totalRevenue.toLocaleString()}</span></div>
          <p className="text-xs font-medium text-gray-500 mb-1 mt-4">المصروفات</p>
          {expenses.map((r) => (
            <div key={r.id} className="flex justify-between text-sm py-0.5"><span>{r.name}</span><span>{r.balance.toLocaleString()}</span></div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1 mt-1"><span>إجمالي المصروفات</span><span>{totalExpenses.toLocaleString()}</span></div>
          <div className="flex justify-between text-base font-bold bg-gray-50 rounded-lg p-3 mt-4">
            <span>{netIncome >= 0 ? "صافي الربح" : "صافي الخسارة"}</span><span>{netIncome.toLocaleString()} ر.س</span>
          </div>
        </div>

        <div className="break-before-page">
          <h1 className="text-xl font-bold text-ink mb-1">الميزانية العمومية</h1>
          <p className="text-sm text-gray-500 mb-4">كما في تاريخ {today}</p>
          <p className="text-xs font-medium text-gray-500 mb-1">الأصول</p>
          {assets.map((r) => (
            <div key={r.id} className="flex justify-between text-sm py-0.5"><span>{r.name}</span><span>{r.balance.toLocaleString()}</span></div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1 mt-1"><span>إجمالي الأصول</span><span>{totalAssets.toLocaleString()}</span></div>
          <p className="text-xs font-medium text-gray-500 mb-1 mt-4">الالتزامات</p>
          {liabilities.map((r) => (
            <div key={r.id} className="flex justify-between text-sm py-0.5"><span>{r.name}</span><span>{r.balance.toLocaleString()}</span></div>
          ))}
          <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-1 mt-1"><span>إجمالي الالتزامات</span><span>{totalLiabilities.toLocaleString()}</span></div>
          <p className="text-xs font-medium text-gray-500 mb-1 mt-4">حقوق الملكية</p>
          {equity.map((r) => (
            <div key={r.id} className="flex justify-between text-sm py-0.5"><span>{r.name}</span><span>{r.balance.toLocaleString()}</span></div>
          ))}
          <div className="flex justify-between text-sm py-0.5"><span>صافي ربح الفترة الحالية</span><span>{netIncome.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-1 mt-1"><span>إجمالي حقوق الملكية</span><span>{(totalEquity + netIncome).toLocaleString()}</span></div>
          <div className="flex justify-between text-base font-bold bg-gray-50 rounded-lg p-3 mt-4">
            <span>إجمالي الالتزامات وحقوق الملكية</span><span>{(totalLiabilities + totalEquity + netIncome).toLocaleString()} ر.س</span>
          </div>
        </div>
      </div>
    </div>
  );
}
