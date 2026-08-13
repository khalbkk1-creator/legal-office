import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ServiceRequestActions from "./ServiceRequestActions";

const typeLabels: Record<string, string> = { CASE: "قضية", CONSULTATION: "استشارة" };

export default async function ServiceRequestDetailPage({ params }: { params: { id: string } }) {
  const [request, categories] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id: params.id },
      include: { client: true, quotation: true, documents: { include: { category: true } } },
    }),
    prisma.documentCategory.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  if (!request) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">طلب {typeLabels[request.requestType]}</h1>
        <p className="text-gray-500 text-sm mt-1">{request.client.name}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-3">بيانات العميل</h2>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400">الاسم:</span> {request.client.name}</p>
          <p dir="ltr" className="text-right"><span className="text-gray-400">الجوال:</span> {request.client.phone}</p>
          {request.client.email && <p dir="ltr" className="text-right"><span className="text-gray-400">البريد:</span> {request.client.email}</p>}
        </div>
        {request.client.accessToken && (
          <Link href={`/clients`} className="text-xs text-primary-700 hover:underline mt-2 inline-block">
            عرض ملف العميل ←
          </Link>
        )}
      </div>

      {request.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-2">تفاصيل الطلب</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{request.notes}</p>
        </div>
      )}

      <ServiceRequestActions
        requestId={request.id}
        requestType={request.requestType}
        status={request.status}
        requestedCategoryIds={request.requestedCategoryIds}
        categories={categories}
        documents={request.documents}
        quotation={request.quotation}
      />
    </div>
  );
}
