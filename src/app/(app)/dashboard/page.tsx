import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isPartner = user?.role === "PARTNER";

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const [
    activeCases,
    newRequests,
    pendingConsultations,
    unpaidInvoices,
    pendingPaymentRequests,
    currentUserFull,
    pendingApprovalCases,
    pendingApprovalConsultations,
    overdueInvoicesCount,
    upcomingHearingsCount,
  ] = await Promise.all([
    prisma.case.count({ where: { status: { not: "CLOSED" } } }),
    prisma.serviceRequest.count({ where: { status: "NEW" } }),
    prisma.consultationRequest.count({ where: { status: "PENDING" } }),
    prisma.sale.count({ where: { paymentStatus: { not: "PAID" } } }),
    prisma.paymentRequest.findMany({
      where: { status: { in: ["PENDING_MANAGER", "PENDING_ACCOUNTANT", "PENDING_FINANCE", "APPROVED", "PAID", "RETURNED"] } },
      select: { status: true, invoiceUrl: true, requestedById: true, requestedBy: { select: { managerId: true } } },
    }),
    user?.id ? prisma.user.findUnique({ where: { id: user.id }, include: { position: true } }) : null,
    prisma.case.count({
      where: {
        status: "UNDER_APPROVAL",
        ...(isPartner ? {} : { lawyer: { managerId: user?.id } }),
      },
    }),
    prisma.consultationRequest.count({
      where: {
        managerApprovedById: null,
        status: { notIn: ["DONE", "CANCELLED"] },
        assignedToId: { not: null },
        ...(isPartner ? {} : { assignedTo: { managerId: user?.id } }),
      },
    }),
    prisma.sale.count({
      where: { paymentStatus: { not: "PAID" }, saleDate: { lt: thirtyDaysAgo } },
    }),
    prisma.hearing.count({
      where: { date: { gte: new Date(), lte: threeDaysFromNow } },
    }),
  ]);

  const isAccountant = !!currentUserFull?.position?.isAccountant;
  const isFinancialManager = !!currentUserFull?.position?.isFinancialManager;

  const myPendingPaymentRequests = pendingPaymentRequests.filter((r) => {
    if (r.status === "PENDING_MANAGER") return r.requestedBy.managerId === user?.id || isPartner;
    if (r.status === "PENDING_ACCOUNTANT") return isAccountant || isPartner;
    if (r.status === "PENDING_FINANCE") return isFinancialManager || isPartner;
    if (r.status === "APPROVED") return r.requestedById === user?.id || isPartner;
    if (r.status === "RETURNED") return r.requestedById === user?.id;
    if (r.status === "PAID" && r.invoiceUrl) return isAccountant || isPartner;
    return false;
  }).length;

  const actionItems: { href: string; label: string; count: number; urgent: boolean }[] = [
    { href: "/payment-requests", label: "طلب صرف بانتظار اعتمادك", count: myPendingPaymentRequests, urgent: true },
    { href: "/cases", label: "قضية بانتظار اعتمادك", count: pendingApprovalCases, urgent: true },
    { href: "/consultations", label: "استشارة بانتظار اعتمادك", count: pendingApprovalConsultations, urgent: true },
    { href: "/accounting?tab=aging", label: "فاتورة متأخرة أكثر من 30 يوم", count: overdueInvoicesCount, urgent: false },
    { href: "/hearings", label: "جلسة خلال 3 أيام", count: upcomingHearingsCount, urgent: false },
  ].filter((a) => a.count > 0);

  // لو عند المستخدم مسمى وظيفي محدد، نصفّي حسب صلاحياته بالضبط. لو ما عنده مسمى (حسابات قديمة)، نرجع لتصفية الدور المعتادة حفاظاً على التوافق. الشريك دائماً يشوف كل شي كصلاحية عليا ثابتة
  const hasPosition = !!currentUserFull?.positionId;
  const allowedModules = currentUserFull?.position?.allowedModules ?? [];

  const today = new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const stats = [
    { href: "/cases", label: "قضايا جارية", value: activeCases, moduleKey: "cases" },
    { href: "/hearings", label: "جلسات خلال 3 أيام", value: upcomingHearingsCount, moduleKey: "hearings" },
    { href: "/consultations", label: "استشارات بانتظار المراجعة", value: pendingConsultations, moduleKey: "consultations" },
    { href: "/service-requests", label: "طلبات خدمة جديدة", value: newRequests, moduleKey: "service-requests" },
    { href: "/accounting", label: "فواتير غير مسددة", value: unpaidInvoices, moduleKey: "accounting" },
    { href: "/payment-requests", label: "طلبات صرف بانتظارك", value: myPendingPaymentRequests, moduleKey: "payment-requests" },
  ].filter((st) => isPartner || (hasPosition ? allowedModules.includes(st.moduleKey) : true));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-gray-500">{today}</p>
        <h1 className="text-2xl font-bold text-ink mt-1">مرحباً، {user?.name}</h1>
      </div>

      {actionItems.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-ink mb-3">بانتظارك اليوم</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {actionItems.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm border transition hover:shadow-card ${
                  a.urgent ? "bg-red-50 border-red-100 text-red-800" : "bg-amber-50 border-amber-100 text-amber-800"
                }`}
              >
                <span>{a.label}</span>
                <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 text-white ${a.urgent ? "bg-red-600" : "bg-amber-500"}`}>{a.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-ink mb-3">نظرة عامة</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map((st) => (
            <Link key={st.href + st.label} href={st.href} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-primary-300 transition">
              <p className="text-3xl font-bold text-ink tabular-nums">{st.value}</p>
              <p className="text-sm text-gray-500 mt-1">{st.label}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
