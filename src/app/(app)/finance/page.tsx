import { prisma } from "@/lib/prisma";

export default async function FinancePage() {
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({ include: { case: true } }),
    prisma.expense.findMany({ include: { category: true, case: true } }),
  ]);

  const now = new Date();
  const thisMonth = (d: Date) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

  const revenueThisMonth = sales.filter((s) => thisMonth(s.saleDate)).reduce((sum, s) => sum + s.totalAmount, 0);
  const expensesThisMonth = expenses.filter((e) => thisMonth(e.expenseDate)).reduce((sum, e) => sum + e.amount, 0);
  const netThisMonth = revenueThisMonth - expensesThisMonth;

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netTotal = totalRevenue - totalExpenses;

  const totalOutstanding = sales.reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0);

  const caseProfit: Record<string, { title: string; caseNumber: string; revenue: number; expense: number }> = {};
  for (const s of sales) {
    if (s.case) {
      const key = s.case.id;
      if (!caseProfit[key]) caseProfit[key] = { title: s.case.title, caseNumber: s.case.caseNumber, revenue: 0, expense: 0 };
      caseProfit[key].revenue += s.totalAmount;
    }
  }
  for (const e of expenses) {
    if (e.case) {
      const key = e.case.id;
      if (!caseProfit[key]) caseProfit[key] = { title: e.case.title, caseNumber: e.case.caseNumber, revenue: 0, expense: 0 };
      caseProfit[key].expense += e.amount;
    }
  }
  const topCases = Object.values(caseProfit)
    .map((c) => ({ ...c, net: c.revenue - c.expense }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 6);

  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.category?.name || "غير مصنّف";
    expenseByCategory[key] = (expenseByCategory[key] || 0) + e.amount;
  }
  const categoryBreakdown = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const maxCategoryAmount = Math.max(1, ...categoryBreakdown.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">اللوحة المالية</h1>
        <p className="text-gray-500 text-sm mt-1">نظرة شاملة على إيرادات ومصاريف المكتب</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">إيرادات هذا الشهر</p>
          <p className="text-2xl font-bold text-primary-700">{revenueThisMonth.toLocaleString()} ر.س</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">مصاريف هذا الشهر</p>
          <p className="text-2xl font-bold text-red-600">{expensesThisMonth.toLocaleString()} ر.س</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">صافي هذا الشهر</p>
          <p className={`text-2xl font-bold ${netThisMonth >= 0 ? "text-primary-700" : "text-red-600"}`}>
            {netThisMonth.toLocaleString()} ر.س
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">إجمالي المستحق (ذمم)</p>
          <p className="text-2xl font-bold text-amber-600">{totalOutstanding.toLocaleString()} ر.س</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-3">الإجمالي منذ البداية</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-400">إجمالي الإيرادات</p>
            <p className="text-lg font-bold text-primary-700 mt-1">{totalRevenue.toLocaleString()} ر.س</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">إجمالي المصاريف</p>
            <p className="text-lg font-bold text-red-600 mt-1">{totalExpenses.toLocaleString()} ر.س</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">صافي الربح</p>
            <p className={`text-lg font-bold mt-1 ${netTotal >= 0 ? "text-primary-700" : "text-red-600"}`}>
              {netTotal.toLocaleString()} ر.س
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-4">أعلى القضايا ربحية</h2>
          {topCases.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد بيانات كافية بعد.</p>
          ) : (
            <div className="space-y-3">
              {topCases.map((c, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.caseNumber}</p>
                  </div>
                  <p className={`text-sm font-bold whitespace-nowrap ${c.net >= 0 ? "text-primary-700" : "text-red-600"}`}>
                    {c.net.toLocaleString()} ر.س
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-4">توزيع المصاريف حسب التصنيف</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد مصاريف مسجّلة بعد.</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map(([name, amount]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{name}</span>
                    <span className="text-ink font-medium">{amount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-red-400 h-2 rounded-full"
                      style={{ width: `${(amount / maxCategoryAmount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
