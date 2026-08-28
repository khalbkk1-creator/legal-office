import { prisma } from "@/lib/prisma";
import PrintButton from "../../PrintButton";

export const dynamic = "force-dynamic";

const typeLabels: Record<string, string> = {
  ASSET: "أصول",
  LIABILITY: "التزامات",
  EQUITY: "حقوق ملكية",
  REVENUE: "إيرادات",
  EXPENSE: "مصروفات",
};

export default async function PrintTrialBalancePage() {
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
      return { ...a, debit: sums.debit, credit: sums.credit, balance };
    });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const today = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white py-10 px-4" dir="rtl">
      <PrintButton />
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm print:shadow-none border border-gray-100 print:border-0 p-10">
        {(settings?.officeName || settings?.logoUrl) && (
          <div className="flex items-center gap-3 border-b border-gray-100 pb-6 mb-6">
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

        <h1 className="text-2xl font-bold text-ink mb-1">ميزان المراجعة</h1>
        <p className="text-sm text-gray-500 mb-6">حتى تاريخ {today}</p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-xs">
              <th className="text-right py-2">الرقم</th>
              <th className="text-right py-2">الحساب</th>
              <th className="text-right py-2">النوع</th>
              <th className="text-right py-2">مدين</th>
              <th className="text-right py-2">دائن</th>
              <th className="text-right py-2">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-500">{r.code}</td>
                <td className="py-2 text-ink">{r.name}</td>
                <td className="py-2 text-gray-500">{typeLabels[r.type]}</td>
                <td className="py-2">{r.debit.toLocaleString()}</td>
                <td className="py-2">{r.credit.toLocaleString()}</td>
                <td className="py-2 font-medium">{r.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-bold">
              <td colSpan={3} className="py-2">الإجمالي</td>
              <td className="py-2">{totalDebit.toLocaleString()}</td>
              <td className="py-2">{totalCredit.toLocaleString()}</td>
              <td className="py-2">{Math.round(totalDebit * 100) === Math.round(totalCredit * 100) ? "متوازن ✓" : "غير متوازن"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
