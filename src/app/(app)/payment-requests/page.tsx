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

  return (
    <PaymentRequestsScreen
      currentUserId={user?.id}
      currentUserRole={user?.role}
      currentUserIsAccountant={!!currentUserFull?.position?.isAccountant}
      currentUserIsFinancialManager={!!currentUserFull?.position?.isFinancialManager}
      requests={JSON.parse(JSON.stringify(requests))}
      payees={JSON.parse(JSON.stringify(payees))}
      categories={categories}
      cases={cases}
      accounts={accounts}
    />
  );
}
