import { prisma } from "@/lib/prisma";
import { ensureChartOfAccounts } from "@/lib/accounting";
import AccountingScreen from "@/components/AccountingScreen";

export default async function AccountingPage() {
  await ensureChartOfAccounts();

  const [accounts, entries, lineSums] = await Promise.all([
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

  return (
    <AccountingScreen
      accounts={JSON.parse(JSON.stringify(accounts))}
      entries={JSON.parse(JSON.stringify(entries))}
      trialBalance={trialBalance}
    />
  );
}
