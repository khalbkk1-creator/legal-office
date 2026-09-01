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
      where: { status: { in: ["PENDING_MANAGER", "PENDING_ACCOUNTANT", "PENDING_FINANCE", "APPROVED", "PAID"] } },
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

  const items: { href: string; label: string; icon: string; badge?: number; partnerOnly?: boolean; moduleKey: string }[] = [
    { href: "/cases", label: "القضايا", icon: "📁", badge: activeCases || undefined, moduleKey: "cases" },
    { href: "/clients", label: "العملاء", icon: "👥", moduleKey: "clients" },
    { href: "/hearings", label: "الجلسات", icon: "📅", moduleKey: "hearings" },
    { href: "/consultations", label: "طلبات الاستشارة", icon: "📩", badge: pendingConsultations || undefined, moduleKey: "consultations" },
    { href: "/service-requests", label: "طلبات الخدمة", icon: "📋", badge: newRequests || undefined, moduleKey: "service-requests" },
    { href: "/accounting", label: "النظام المحاسبي", icon: "📒", badge: unpaidInvoices || undefined, moduleKey: "accounting" },
    { href: "/payment-requests", label: "طلبات الصرف", icon: "💸", badge: myPendingPaymentRequests || undefined, moduleKey: "payment-requests" },
    { href: "/payees", label: "الموردون", icon: "📇", moduleKey: "payees" },
    { href: "/quotes", label: "عروض الأسعار", icon: "📝", moduleKey: "quotes" },
    { href: "/finance", label: "اللوحة المالية", icon: "📊", moduleKey: "finance" },
    { href: "/analytics", label: "الإحصائيات", icon: "📈", moduleKey: "analytics" },
    { href: "/users", label: "المستخدمون", icon: "🔑", partnerOnly: true, moduleKey: "users" },
    { href: "/positions", label: "المسميات والصلاحيات", icon: "🛡️", partnerOnly: true, moduleKey: "positions" },
    { href: "/api-keys", label: "مفاتيح API الخارجية", icon: "🔌", partnerOnly: true, moduleKey: "api-keys" },
    { href: "/settings", label: "إعدادات المكتب", icon: "⚙️", partnerOnly: true, moduleKey: "settings" },
  ];

  // لو عند المستخدم مسمى وظيفي محدد، نصفّي حسب صلاحياته بالضبط. لو ما عنده مسمى (حسابات قديمة)، نرجع لتصفية الدور المعتادة حفاظاً على التوافق. الشريك دائماً يشوف كل شي كصلاحية عليا ثابتة
  const hasPosition = !!currentUserFull?.positionId;
  const allowedModules = currentUserFull?.position?.allowedModules ?? [];
  const visibleItems = isPartner
    ? items
    : hasPosition
    ? items.filter((i) => allowedModules.includes(i.moduleKey))
    : items.filter((i) => !i.partnerOnly);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink">مرحباً، {user?.name}</h1>
        <p className="text-gray-500 text-sm mt-1">اختر الشاشة اللي تبي تدخلها</p>
      </div>

      {actionItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 mb-6">
          <p className="text-sm font-bold text-ink mb-3 flex items-center gap-1.5">
            <span>🔔</span> بانتظارك اليوم
          </p>
          <div className="space-y-2">
            {actionItems.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition hover:opacity-80 ${
                  a.urgent ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                <span>{a.label}</span>
                <span
                  className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                    a.urgent ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                  }`}
                >
                  {a.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-primary-300 hover:shadow-md transition relative"
          >
            {!!item.badge && (
              <span className="absolute top-2 left-2 text-[10px] bg-primary-700 text-white rounded-full px-1.5 py-0.5 font-medium min-w-[18px] text-center">
                {item.badge}
              </span>
            )}
            <span className="text-3xl">{item.icon}</span>
            <span className="text-sm font-medium text-ink text-center">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
