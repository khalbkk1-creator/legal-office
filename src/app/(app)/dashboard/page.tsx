import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isPartner = user?.role === "PARTNER";
  const [activeCases, newRequests, pendingConsultations, unpaidInvoices, pendingPaymentRequests, currentUserFull] = await Promise.all([
    prisma.case.count({ where: { status: { not: "CLOSED" } } }),
    prisma.serviceRequest.count({ where: { status: "NEW" } }),
    prisma.consultationRequest.count({ where: { status: "PENDING" } }),
    prisma.sale.count({ where: { paymentStatus: { not: "PAID" } } }),
    prisma.paymentRequest.findMany({
      where: { status: { in: ["PENDING_MANAGER", "PENDING_ACCOUNTANT", "PENDING_FINANCE", "APPROVED", "PAID"] } },
      select: { status: true, invoiceUrl: true, requestedById: true, requestedBy: { select: { managerId: true } } },
    }),
    user?.id ? prisma.user.findUnique({ where: { id: user.id }, include: { position: true } }) : null,
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
