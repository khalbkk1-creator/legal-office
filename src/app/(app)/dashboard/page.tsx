import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isPartner = user?.role === "PARTNER";

  const [activeCases, newRequests, pendingConsultations, unpaidInvoices, pendingPaymentRequests] = await Promise.all([
    prisma.case.count({ where: { status: { not: "CLOSED" } } }),
    prisma.serviceRequest.count({ where: { status: "NEW" } }),
    prisma.consultationRequest.count({ where: { status: "PENDING" } }),
    prisma.sale.count({ where: { paymentStatus: { not: "PAID" } } }),
    prisma.paymentRequest.findMany({
      where: { status: { in: ["PENDING_MANAGER", "PENDING_FINANCE", "APPROVED", "PAID"] } },
      select: { status: true, invoiceUrl: true, requestedBy: { select: { managerId: true } } },
    }),
  ]);

  const myPendingPaymentRequests = pendingPaymentRequests.filter((r) => {
    if (r.status === "PENDING_MANAGER") return r.requestedBy.managerId === user?.id || isPartner;
    if (r.status === "PENDING_FINANCE") return isPartner;
    if (r.status === "APPROVED") return isPartner;
    if (r.status === "PAID" && r.invoiceUrl) return isPartner;
    return false;
  }).length;

  const items: { href: string; label: string; icon: string; badge?: number; partnerOnly?: boolean }[] = [
    { href: "/cases", label: "القضايا", icon: "📁", badge: activeCases || undefined },
    { href: "/clients", label: "العملاء", icon: "👥" },
    { href: "/hearings", label: "الجلسات", icon: "📅" },
    { href: "/consultations", label: "طلبات الاستشارة", icon: "📩", badge: pendingConsultations || undefined },
    { href: "/service-requests", label: "طلبات الخدمة", icon: "📋", badge: newRequests || undefined },
    { href: "/accounting", label: "النظام المحاسبي", icon: "📒", badge: unpaidInvoices || undefined },
    { href: "/payment-requests", label: "طلبات الصرف", icon: "💸", badge: myPendingPaymentRequests || undefined },
    { href: "/quotes", label: "عروض الأسعار", icon: "📝" },
    { href: "/finance", label: "اللوحة المالية", icon: "📊" },
    { href: "/analytics", label: "الإحصائيات", icon: "📈" },
    { href: "/users", label: "المستخدمون", icon: "🔑", partnerOnly: true },
    { href: "/settings", label: "إعدادات المكتب", icon: "⚙️", partnerOnly: true },
  ];

  const visibleItems = items.filter((i) => !i.partnerOnly || isPartner);

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
