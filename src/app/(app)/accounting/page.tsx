import { prisma } from "@/lib/prisma";
import { upgradeChartHierarchy } from "@/lib/accounting";
import AccountingScreen from "@/components/AccountingScreen";

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  await upgradeChartHierarchy();

  const [accounts, entries, lineSums, sales, expenses] = await Promise.all([
    prisma.account.findMany({ orderBy: { code: "asc" } }),
    prisma.journalEntry.findMany({
      include: { lines: { include: { account: true } }, createdBy: true, reversedBy: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.journalEntryLine.groupBy({
      by: ["accountId"],
      _sum: { debit: true, credit: true },
    }),
    prisma.sale.findMany({ include: { client: true, case: true }, orderBy: { saleDate: "desc" } }),
    prisma.expense.findMany({ include: { category: true, case: true }, orderBy: { expenseDate: "desc" } }),
  ]);

  const sumsByAccount: Record<string, { debit: number; credit: number }> = {};
  for (const s of lineSums) {
    sumsByAccount[s.accountId] = { debit: s._sum.debit ?? 0, credit: s._sum.credit ?? 0 };
  }

  const trialBalance = accounts
    .filter((a) => sumsByAccount[a.id])
    .map((a) => {
      const sums = sumsByAccount[a.id];
      const isDebitNormal = a.type === "ASSET" || a.type === "EXPENSE";
      const balance = isDebitNormal ? sums.debit - sums.credit : sums.credit - sums.debit;
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debit: sums.debit,
        credit: sums.credit,
        balance,
      };
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

  const validTabs = ["invoices", "expenses", "journal", "accounts", "trial"];
  const initialTab = validTabs.includes(searchParams.tab ?? "") ? (searchParams.tab as any) : "journal";

  return (
    <AccountingScreen
      accounts={JSON.parse(JSON.stringify(accounts))}
      entries={JSON.parse(JSON.stringify(entries))}
      trialBalance={trialBalance}
      sales={JSON.parse(JSON.stringify(sales))}
      expenses={expenses.map((e) => ({ ...e, expenseDate: e.expenseDate.toISOString() }))}
      salesSummary={{ totalThisMonth, totalOutstanding, topCases }}
      expenseSummary={{ totalThisMonth: expenseTotalThisMonth, topCategories }}
      initialTab={initialTab}
    />
  );
}
