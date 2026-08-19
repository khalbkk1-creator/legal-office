import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortalTabs from "./PortalTabs";

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const client = await prisma.client.findUnique({
    where: { accessToken: params.token },
    include: {
      cases: {
        include: {
          hearings: { orderBy: { date: "desc" }, take: 5 },
          documents: { include: { category: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
      sales: { orderBy: { saleDate: "desc" } },
      quotations: { orderBy: { createdAt: "desc" } },
      serviceRequests: { orderBy: { createdAt: "desc" } },
      consultationRequests: { orderBy: { requestedDate: "desc" } },
    },
  });

  const [settings, allCategories, upcomingHearings] = await Promise.all([
    prisma.officeSettings.findFirst(),
    prisma.documentCategory.findMany(),
    prisma.hearing.findMany({
      where: { case: { clientId: client?.id ?? "" }, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 3,
      include: { case: true },
    }),
  ]);

  if (!client) notFound();

  const totalOutstanding = client.sales.reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0);
  const unpaidSales = client.sales.filter((s) => s.paymentStatus !== "PAID");
  const upcomingConsultations = client.consultationRequests
    .filter((c) => c.status === "CONFIRMED" && new Date(c.requestedDate) >= new Date())
    .sort((a, b) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime());

  const rates = {
    PHONE: settings?.phoneConsultationRate ?? 0,
    IN_PERSON: settings?.inPersonConsultationRate ?? 0,
    WRITTEN: settings?.writtenConsultationRate ?? 0,
  };
  const availability = {
    days: settings?.consultationDays ?? [0, 1, 2, 3, 4],
    startTime: settings?.consultationStartTime ?? "09:00",
    endTime: settings?.consultationEndTime ?? "17:00",
  };

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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <h1 className="text-xl font-bold text-ink">مرحباً، {client.name}</h1>
          <p className="text-sm text-gray-500 mt-1">اختر الشاشة اللي تبي تدخلها من الأسفل.</p>
        </div>

        {(totalOutstanding > 0 || upcomingConsultations.length > 0 || upcomingHearings.length > 0) && (
          <div className="space-y-3">
            {totalOutstanding > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ⚠️ لديك مبلغ مستحق قدره <span className="font-bold">{totalOutstanding.toLocaleString()} ر.س</span>
                </p>
                <div className="space-y-1">
                  {unpaidSales.map((s) => (
                    <p key={s.id} className="text-xs text-red-700">
                      {s.invoiceNumber} — {(s.totalAmount - s.paidAmount).toLocaleString()} ر.س ({s.paymentStatus === "PARTIAL" ? "مدفوعة جزئياً" : "غير مدفوعة"})
                    </p>
                  ))}
                </div>
              </div>
            )}

            {upcomingConsultations.length > 0 && (
              <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
                <p className="text-sm text-primary-800 font-medium mb-2">📅 موعدك القادم</p>
                {upcomingConsultations.slice(0, 2).map((c) => (
                  <p key={c.id} className="text-xs text-primary-700">
                    {new Date(c.requestedDate).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
                    {" — "}
                    {new Date(c.requestedDate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                ))}
              </div>
            )}

            {upcomingHearings.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">⚖️ جلسات قادمة</p>
                {upcomingHearings.map((h) => (
                  <p key={h.id} className="text-xs text-blue-700">
                    {h.case.title} — {new Date(h.date).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <PortalTabs
          token={params.token}
          cases={JSON.parse(JSON.stringify(client.cases))}
          serviceRequests={JSON.parse(JSON.stringify(client.serviceRequests))}
          consultationRequests={JSON.parse(JSON.stringify(client.consultationRequests))}
          quotations={JSON.parse(JSON.stringify(client.quotations))}
          sales={JSON.parse(JSON.stringify(client.sales))}
          allCategories={allCategories}
          rates={rates}
          availability={availability}
        />

        {settings?.phone && (
          <p className="text-center text-xs text-gray-400">للتواصل: {settings.phone}</p>
        )}
      </div>
    </div>
  );
}
