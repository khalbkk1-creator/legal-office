import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PaymentRequestsScreen from "@/components/PaymentRequestsScreen";

export const dynamic = "force-dynamic";

export default async function PaymentRequestsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  const [requests, payees, categories, cases, accounts, allUsers] = await Promise.all([
    prisma.paymentRequest.findMany({
      include: {
        payee: true,
        category: true,
        case: true,
        requestedBy: true,
        managerApprovedBy: true,
        financeApprovedBy: true,
        rejectedBy: true,
        closedBy: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payee.findMany({ orderBy: { name: "asc" } }),
    prisma.expenseCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.case.findMany({ select: { id: true, caseNumber: true, title: true }, orderBy: { createdAt: "desc" } }),
    prisma.account.findMany({ where: { code: { startsWith: "10" }, NOT: { code: "1100" } }, orderBy: { code: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, managerId: true } }),
  ]);

  return (
    <PaymentRequestsScreen
      currentUserId={user?.id}
      currentUserRole={user?.role}
      requests={JSON.parse(JSON.stringify(requests))}
      payees={JSON.parse(JSON.stringify(payees))}
      categories={categories}
      cases={cases}
      accounts={accounts}
      allUsers={allUsers}
    />
  );
}
