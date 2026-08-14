import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuoteResponse from "./QuoteResponse";
import PortalUpload from "./PortalUpload";
import ServiceRequestUpload from "./ServiceRequestUpload";
import ClarificationReply from "./ClarificationReply";
import PortalMessages from "./PortalMessages";

const statusLabels: Record<string, { label: string; color: string }> = {
  UNDER_REVIEW: { label: "تحت الدراسة", color: "bg-blue-50 text-blue-700" },
  UNDER_APPROVAL: { label: "تحت الاعتماد", color: "bg-purple-50 text-purple-700" },
  ACTIVE: { label: "جارية", color: "bg-primary-50 text-primary-700" },
  ON_HOLD: { label: "معلقة", color: "bg-amber-50 text-amber-700" },
  CLOSED: { label: "مغلقة", color: "bg-red-50 text-red-600" },
};

const quoteStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "بانتظار ردك", color: "bg-amber-50 text-amber-700" },
  ACCEPTED: { label: "تمت الموافقة", color: "bg-primary-50 text-primary-700" },
  REJECTED: { label: "مرفوض", color: "bg-red-50 text-red-600" },
  EXPIRED: { label: "منتهي الصلاحية", color: "bg-gray-100 text-gray-600" },
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
    },
  });

  const [settings, allCategories] = await Promise.all([
    prisma.officeSettings.findFirst(),
    prisma.documentCategory.findMany(),
  ]);

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
                      <div key={h.id} className="mb-1">
                        <p className="text-xs text-gray-600">
                          {new Date(h.date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                          {h.court ? ` — ${h.court}` : ""}
                        </p>
                        {h.reportUrl && (
                          <a
                            href={h.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-700 hover:underline"
                          >
                            📄 {h.reportName || "تقرير الجلسة"}
                          </a>
                        )}
                      </div>
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
                <PortalUpload token={params.token} caseId={c.id} />
                <PortalMessages
                  token={params.token}
                  caseId={c.id}
                  messages={c.messages.map((m) => ({
                    id: m.id,
                    fromClient: m.fromClient,
                    message: m.message,
                    createdAt: m.createdAt.toISOString(),
                  }))}
                />
              </div>
            ))}
            {client.cases.length === 0 && (
              <p className="text-sm text-gray-400">لا توجد قضايا مسجّلة بعد.</p>
            )}
          </div>
        </div>

        {client.serviceRequests.filter((r) => r.status === "DOCS_REQUESTED" || r.status === "DOCS_SUBMITTED").length > 0 && (
          <div>
            <h2 className="font-bold text-ink mb-3">مستندات مطلوبة منك</h2>
            <div className="space-y-3">
              {client.serviceRequests
                .filter((r) => r.status === "DOCS_REQUESTED" || r.status === "DOCS_SUBMITTED")
                .map((r) => {
                  const reqCategories = allCategories.filter((c) => r.requestedCategoryIds.includes(c.id));
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      {reqCategories.length > 0 && (
                        <p className="text-sm font-medium text-ink mb-2">
                          المستندات المطلوبة: {reqCategories.map((c) => c.name).join("، ")}
                        </p>
                      )}
                      {reqCategories.length > 0 && (
                        <ServiceRequestUpload token={params.token} requestId={r.id} categories={reqCategories} />
                      )}
                      {r.clarificationRequest && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-ink mb-1">📩 {r.clarificationRequest}</p>
                          <ClarificationReply token={params.token} requestId={r.id} existingReply={r.clientReply} />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-bold text-ink mb-3">عروض الأسعار</h2>
          <div className="space-y-3">
            {client.quotations.map((q) => (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-ink">{q.quoteNumber}</p>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${quoteStatusLabels[q.status].color}`}>
                    {quoteStatusLabels[q.status].label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{q.description}</p>
                <p className="text-sm font-bold text-primary-700 mb-2">{q.totalAmount.toLocaleString()} ر.س</p>
                {q.status === "PENDING" && <QuoteResponse token={params.token} quoteId={q.id} />}
              </div>
            ))}
            {client.quotations.length === 0 && (
              <p className="text-sm text-gray-400">لا توجد عروض أسعار حالياً.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-bold text-ink mb-3">فواتيرك</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
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
