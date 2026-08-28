import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalClient } from "@/lib/portalAuth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

const caseStatusLabels: Record<string, string> = {
  UNDER_REVIEW: "تحت الدراسة",
  UNDER_APPROVAL: "تحت الاعتماد",
  ACTIVE: "جارية",
  ON_HOLD: "معلقة",
  CLOSED: "مغلقة",
};

export default async function PortalAccountPage() {
  const client = await getPortalClient();
  if (!client) redirect("/portal/login");

  const [cases, sales] = await Promise.all([
    prisma.case.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.findMany({
      where: { clientId: client.id },
      orderBy: { saleDate: "desc" },
    }),
  ]);

  const totalOutstanding = sales
    .filter((s) => s.paymentStatus !== "PAID")
    .reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-card">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">مرحباً</p>
            <h1 className="text-lg font-bold text-ink">{client.name}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-up">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
            <p className="text-xs text-gray-400 mb-1">عدد القضايا</p>
            <p className="text-2xl font-bold text-ink">{cases.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
            <p className="text-xs text-gray-400 mb-1">عدد الفواتير</p>
            <p className="text-2xl font-bold text-ink">{sales.length}</p>
          </div>
          <div className={`rounded-2xl border p-5 ${totalOutstanding > 0 ? "bg-amber-50 border-amber-100" : "bg-white border-gray-100 shadow-card"}`}>
            <p className="text-xs text-gray-500 mb-1">مستحقات غير مسددة</p>
            <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-amber-700" : "text-ink"}`}>
              {totalOutstanding.toLocaleString()} ر.س
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">قضاياك</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-5 py-2 font-medium">رقم القضية</th>
                <th className="text-right px-5 py-2 font-medium">الموضوع</th>
                <th className="text-right px-5 py-2 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 text-ink font-medium">{c.caseNumber}</td>
                  <td className="px-5 py-3 text-gray-600">{c.title}</td>
                  <td className="px-5 py-3 text-gray-500">{caseStatusLabels[c.status] ?? c.status}</td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">لا توجد قضايا مسجّلة بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 font-bold text-ink text-sm">فواتيرك</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-5 py-2 font-medium">رقم الفاتورة</th>
                <th className="text-right px-5 py-2 font-medium">الوصف</th>
                <th className="text-right px-5 py-2 font-medium">المبلغ</th>
                <th className="text-right px-5 py-2 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 text-ink font-medium">{s.invoiceNumber}</td>
                  <td className="px-5 py-3 text-gray-600">{s.description}</td>
                  <td className="px-5 py-3 text-gray-700">{s.totalAmount.toLocaleString()} ر.س</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${s.paymentStatus === "PAID" ? "bg-primary-50 text-primary-700" : "bg-amber-50 text-amber-700"}`}>
                      {s.paymentStatus === "PAID" ? "مدفوعة" : s.paymentStatus === "PARTIAL" ? "مدفوعة جزئياً" : "غير مدفوعة"}
                    </span>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">لا توجد فواتير بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 text-center">
          لأي استفسار تواصل مباشرة مع مكتبنا. <Link href="/portal/login" className="text-primary-700 hover:underline">تسجيل الدخول بحساب آخر</Link>
        </p>
      </main>
    </div>
  );
}
