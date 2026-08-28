import { prisma } from "@/lib/prisma";
import PrintButton from "../../PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintVatPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const now = new Date();
  const fromDate = searchParams.from ? new Date(searchParams.from + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = searchParams.to ? new Date(searchParams.to + "T23:59:59") : now;

  const [sales, expenses, settings] = await Promise.all([
    prisma.sale.findMany({ where: { saleDate: { gte: fromDate, lte: toDate } }, orderBy: { saleDate: "asc" } }),
    prisma.expense.findMany({ where: { expenseDate: { gte: fromDate, lte: toDate }, vatAmount: { gt: 0 } }, orderBy: { expenseDate: "asc" } }),
    prisma.officeSettings.findFirst(),
  ]);

  const outputVat = sales.reduce((s, x) => s + x.vatAmount, 0);
  const inputVat = expenses.reduce((s, x) => s + x.vatAmount, 0);
  const netDue = outputVat - inputVat;

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

        <h1 className="text-2xl font-bold text-ink mb-1">تقرير ضريبة القيمة المضافة</h1>
        <p className="text-sm text-gray-500 mb-6">
          من {fromDate.toLocaleDateString("ar-SA")} إلى {toDate.toLocaleDateString("ar-SA")}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">ضريبة المخرجات</p>
            <p className="text-lg font-bold text-ink">{outputVat.toLocaleString()} ر.س</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">ضريبة المدخلات</p>
            <p className="text-lg font-bold text-ink">{inputVat.toLocaleString()} ر.س</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">{netDue >= 0 ? "المستحق للتوريد" : "رصيد لصالحك"}</p>
            <p className="text-lg font-bold text-ink">{Math.abs(netDue).toLocaleString()} ر.س</p>
          </div>
        </div>

        <h2 className="text-sm font-bold text-ink mb-2">فواتير المخرجات</h2>
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-xs">
              <th className="text-right py-1">الفاتورة</th>
              <th className="text-right py-1">التاريخ</th>
              <th className="text-right py-1">الضريبة</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-b border-gray-100">
                <td className="py-1">{s.invoiceNumber}</td>
                <td className="py-1">{s.saleDate.toLocaleDateString("ar-SA")}</td>
                <td className="py-1">{s.vatAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-sm font-bold text-ink mb-2">مصاريف المدخلات</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-xs">
              <th className="text-right py-1">الوصف</th>
              <th className="text-right py-1">التاريخ</th>
              <th className="text-right py-1">الضريبة</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-gray-100">
                <td className="py-1">{e.description}</td>
                <td className="py-1">{e.expenseDate.toLocaleDateString("ar-SA")}</td>
                <td className="py-1">{e.vatAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
