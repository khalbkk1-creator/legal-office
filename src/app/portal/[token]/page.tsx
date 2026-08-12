import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<string, { label: string; color: string }> = {
  UNDER_REVIEW: { label: "تحت الدراسة", color: "bg-blue-50 text-blue-700" },
  UNDER_APPROVAL: { label: "تحت الاعتماد", color: "bg-purple-50 text-purple-700" },
  ACTIVE: { label: "جارية", color: "bg-primary-50 text-primary-700" },
  ON_HOLD: { label: "معلقة", color: "bg-amber-50 text-amber-700" },
  CLOSED: { label: "مغلقة", color: "bg-red-50 text-red-600" },
};

const paymentLabels: Record<string, { label: string; color: string }> = {
  PAID: { label: "مدفوعة", color: "bg-primary-50 text-primary-700" },
  UNPAID: { label: "غير مدفوعة", color: "bg-red-50 text-red-600" },
  PARTIAL: { label: "مدفوعة جزئياً", color: "bg-amber-50 text-amber-700" },
};

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const client = await prisma.client.findUnique({
    where: { accessToken: params.token },
    include: {
      cases: {
        include: { hearings: { orderBy: { date: "desc" }, take: 5 }, documents: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
      },
      sales: { orderBy: { saleDate: "desc" } },
    },
  });

  const settings = await prisma.officeSettings.findFirst();

  if (!client) notFound();

  const totalOutstanding = client.sales.reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          {settings?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="" className="w-12 h-12 object-contain" />
          )}
          <div>
            {settings?.officeName && <p className="font-bold text-ink">{settings.officeName}</p>}
            <p className="text-xs text-gray-400">بوابة العميل</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-xl font-bold text-ink">مرحباً، {client.name}</h1>
          <p className="text-sm text-gray-500 mt-1">هذه صفحتك الخاصة لمتابعة قضاياك وفواتيرك ومرفقاتك.</p>
        </div>

        {totalOutstanding > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
            لديك مبلغ مستحق قدره <span className="font-bold">{totalOutstanding.toLocaleString()} ر.س</span>
          </div>
        )}

        <div>
          <h2 className="font-bold text-ink mb-3">قضاياك</h2>
          <div className="space-y-4">
            {client.cases.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-ink">{c.title}</p>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[c.status].color}`}>
                    {statusLabels[c.status].label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{c.caseNumber} · {c.caseType}</p>

                {c.hearings.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">آخر الجلسات</p>
                    {c.hearings.map((h) => (
                      <p key={h.id} className="text-xs text-gray-600">
                        {new Date(h.date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                        {h.court ? ` — ${h.court}` : ""}
                      </p>
                    ))}
                  </div>
                )}

                {c.documents.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">المرفقات</p>
                    <div className="flex flex-wrap gap-2">
                      {c.documents.map((d) => (
                        <a
                          key={d.id}
                          href={d.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-700 hover:underline bg-primary-50 rounded-lg px-2 py-1"
                        >
                          📄 {d.fileName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {client.cases.length === 0 && (
              <p className="text-sm text-gray-400">لا توجد قضايا مسجّلة بعد.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-bold text-ink mb-3">فواتيرك</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-right px-4 py-2 font-medium">رقم الفاتورة</th>
                  <th className="text-right px-4 py-2 font-medium">الوصف</th>
                  <th className="text-right px-4 py-2 font-medium">المبلغ</th>
                  <th className="text-right px-4 py-2 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {client.sales.map((s) => (
                  <tr key={s.id} className="border-t border-gray-50">
                    <td className="px-4 py-2 font-medium text-ink">{s.invoiceNumber}</td>
                    <td className="px-4 py-2 text-gray-600">{s.description}</td>
                    <td className="px-4 py-2 text-ink">{s.totalAmount.toLocaleString()} ر.س</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${paymentLabels[s.paymentStatus].color}`}>
                        {paymentLabels[s.paymentStatus].label}
                      </span>
                    </td>
                  </tr>
                ))}
                {client.sales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">لا توجد فواتير بعد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {settings?.phone && (
          <p className="text-center text-xs text-gray-400">للتواصل: {settings.phone}</p>
        )}
      </div>
    </div>
  );
}
