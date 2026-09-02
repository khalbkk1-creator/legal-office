import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PaymentRequestsScreen from "@/components/PaymentRequestsScreen";

export const dynamic = "force-dynamic";

export default async function PaymentRequestsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  const [requests, payees, categories, cases, accounts, currentUserFull] = await Promise.all([
    prisma.paymentRequest.findMany({
      include: {
        payee: true,
        category: true,
        case: true,
        requestedBy: true,
        managerApprovedBy: true,
        accountantApprovedBy: true,
        financeApprovedBy: true,
        rejectedBy: true,
        returnedBy: true,
        closedBy: true,
        activities: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payee.findMany({ orderBy: { name: "asc" } }),
    prisma.expenseCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.case.findMany({ select: { id: true, caseNumber: true, title: true }, orderBy: { createdAt: "desc" } }),
    prisma.account.findMany({ where: { code: { startsWith: "10" }, NOT: { code: "1100" } }, orderBy: { code: "asc" } }),
    user?.id ? prisma.user.findUnique({ where: { id: user.id }, include: { position: true } }) : null,
  ]);

  const entryIds = requests.flatMap((r) => [r.paymentJournalEntryId, r.closingJournalEntryId]).filter(Boolean) as string[];
  const adjustmentEntries = await prisma.journalEntry.findMany({
    where: { sourceType: "MANUAL", sourceId: { in: requests.map((r) => r.id) } },
    select: { id: true, entryNumber: true, date: true, sourceId: true, description: true },
  });
  const linkedEntries = entryIds.length
    ? await prisma.journalEntry.findMany({ where: { id: { in: entryIds } }, select: { id: true, entryNumber: true, date: true } })
    : [];
  const entryById = Object.fromEntries(linkedEntries.map((e) => [e.id, e]));
  const requestsWithEntries = requests.map((r) => ({
    ...r,
    journal: {
      payment: r.paymentJournalEntryId ? entryById[r.paymentJournalEntryId] ?? null : null,
      closing: r.closingJournalEntryId ? entryById[r.closingJournalEntryId] ?? null : null,
      adjustments: adjustmentEntries.filter((e) => e.sourceId === r.id),
    },
  }));
  const [expenseAccounts, allAccounts] = await Promise.all([
    prisma.account.findMany({ where: { type: "EXPENSE", isActive: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.account.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, type: true } }),
  ]);

  return (
    <PaymentRequestsScreen
      currentUserId={user?.id}
      currentUserRole={user?.role}
      currentUserIsAccountant={!!currentUserFull?.position?.isAccountant}
      currentUserIsFinancialManager={!!currentUserFull?.position?.isFinancialManager}
      requests={JSON.parse(JSON.stringify(requestsWithEntries))}
      expenseAccounts={expenseAccounts}
      allAccounts={allAccounts}
      payees={JSON.parse(JSON.stringify(payees))}
      categories={categories}
      cases={cases}
      accounts={accounts}
    />
  );
}
