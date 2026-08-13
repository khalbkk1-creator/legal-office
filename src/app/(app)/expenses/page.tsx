import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DeleteExpenseButton from "./DeleteExpenseButton";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    include: { category: true, case: true },
    orderBy: { expenseDate: "desc" },
  });

  const now = new Date();
  const thisMonth = expenses.filter(
    (e) => e.expenseDate.getMonth() === now.getMonth() && e.expenseDate.getFullYear() === now.getFullYear()
  );
  const totalThisMonth = thisMonth.reduce((sum, e) => sum + e.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const e of thisMonth) {
    const key = e.category?.name || "غير مصنّف";
    byCategory[key] = (byCategory[key] || 0) + e.amount;
  }
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">المصاريف</h1>
          <p className="text-gray-500 text-sm mt-1">مصاريف المكتب التشغيلية</p>
        </div>
        <Link
          href="/expenses/new"
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          + مصروف جديد
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">مصاريف هذا الشهر</p>
          <p className="text-2xl font-bold text-red-600">{totalThisMonth.toLocaleString()} ر.س</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-2">أعلى بنود المصروفات هذا الشهر</p>
          {topCategories.length === 0 ? (
            <p className="text-xs text-gray-400">لا توجد بيانات بعد</p>
          ) : (
            <div className="space-y-1">
              {topCategories.map(([name, total]) => (
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
                  <DeleteExpenseButton expenseId={e.id} />
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
    </div>
  );
}
