import { prisma } from "@/lib/prisma";
import BillingScreen from "@/components/BillingScreen";

export default async function SalesPage() {
  const [sales, quotes] = await Promise.all([
    prisma.sale.findMany({ include: { client: true, case: true }, orderBy: { saleDate: "desc" } }),
    prisma.quotation.findMany({ include: { client: true, case: true }, orderBy: { createdAt: "desc" } }),
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

  return (
    <BillingScreen
      initialTab="sales"
      sales={sales}
      quotes={quotes}
      summary={{ totalThisMonth, totalOutstanding, topCases }}
    />
  );
}
