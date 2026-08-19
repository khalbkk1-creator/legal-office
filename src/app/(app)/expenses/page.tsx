import { prisma } from "@/lib/prisma";
import BillingScreen from "@/components/BillingScreen";

export default async function ExpensesPage() {
  const [sales, quotes, expenses] = await Promise.all([
    prisma.sale.findMany({ include: { client: true, case: true }, orderBy: { saleDate: "desc" } }),
    prisma.quotation.findMany({ include: { client: true, case: true }, orderBy: { createdAt: "desc" } }),
    prisma.expense.findMany({ include: { category: true, case: true }, orderBy: { expenseDate: "desc" } }),
  ]);

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
  const topCases = Object.values(caseRevenue).sort((a, b) => b.total - a.total);

  const thisMonthExpenses = expenses.filter(
    (e) => e.expenseDate.getMonth() === now.getMonth() && e.expenseDate.getFullYear() === now.getFullYear()
  );
  const expenseTotalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of thisMonthExpenses) {
    const key = e.category?.name || "غير مصنّف";
    byCategory[key] = (byCategory[key] || 0) + e.amount;
  }
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3) as [string, number][];

  return (
    <BillingScreen
      initialTab="expenses"
      sales={sales}
      quotes={quotes}
      expenses={expenses.map((e) => ({ ...e, expenseDate: e.expenseDate.toISOString() }))}
      summary={{ totalThisMonth, totalOutstanding, topCases }}
      expenseSummary={{ totalThisMonth: expenseTotalThisMonth, topCategories }}
    />
  );
}
