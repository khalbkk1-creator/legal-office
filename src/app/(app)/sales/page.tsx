import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MarkPaidButton from "./MarkPaidButton";

const statusLabels: Record<string, { label: string; color: string }> = {
  PAID: { label: "مدفوعة", color: "bg-primary-50 text-primary-700" },
  UNPAID: { label: "غير مدفوعة", color: "bg-red-50 text-red-600" },
  PARTIAL: { label: "مدفوعة جزئياً", color: "bg-amber-50 text-amber-700" },
};

export default async function SalesPage() {
  const sales = await prisma.sale.findMany({
    include: { client: true, case: true },
    orderBy: { saleDate: "desc" },
  });

  const now = new Date();
  const thisMonthSales = sales.filter(
    (s) => s.saleDate.getMonth() === now.getMonth() && s.saleDate.getFullYear() === now.getFullYear()
  );
  const totalThisMonth = thisMonthSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalOutstanding = sales.reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0);

  const caseRevenue: Record<string, { title: string; total: number }> = {};
  for (const s of sales) {
    if (s.case) {
      if (!caseRevenue[s.case.id]) caseRevenue[s.case.id] = { title: s.case.title, total: 0 };
      caseRevenue[s.case.id].total += s.totalAmount;
    }
  }
  const topCases = Object.values(caseRevenue)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">المبيعات</h1>
          <p className="text-gray-500 text-sm mt-1">فواتير الخدمات والإيرادات</p>
        </div>
        <Link
          href="/sales/new"
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          + فاتورة جديدة
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">مبيعات هذا الشهر</p>
          <p className="text-2xl font-bold text-ink">{totalThisMonth.toLocaleString()} ر.س</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">إجمالي المستحق</p>
          <p className="text-2xl font-bold text-red-600">{totalOutstanding.toLocaleString()} ر.س</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-2">أعلى القضايا إيراداً</p>
          {topCases.length === 0 ? (
            <p className="text-xs text-gray-400">لا توجد بيانات بعد</p>
          ) : (
            <div className="space-y-1">
              {topCases.slice(0, 3).map((c, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-600 truncate">{c.title}</span>
                  <span className="text-ink font-medium">{c.total.toLocaleString()} ر.س</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[s.paymentStatus].color}`}>
                    {statusLabels[s.paymentStatus].label}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {s.paymentStatus !== "PAID" && <MarkPaidButton saleId={s.id} totalAmount={s.totalAmount} />}
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
    </div>
  );
}
