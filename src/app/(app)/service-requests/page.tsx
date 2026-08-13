import Link from "next/link";
import { prisma } from "@/lib/prisma";

const typeLabels: Record<string, string> = { CASE: "قضية", CONSULTATION: "استشارة" };
const statusLabels: Record<string, { label: string; color: string }> = {
  NEW: { label: "طلب جديد", color: "bg-blue-50 text-blue-700" },
  DOCS_REQUESTED: { label: "بانتظار مستندات", color: "bg-amber-50 text-amber-700" },
  DOCS_SUBMITTED: { label: "تم رفع المستندات", color: "bg-purple-50 text-purple-700" },
  QUOTE_SENT: { label: "تم إرسال عرض سعر", color: "bg-purple-50 text-purple-700" },
  ACCEPTED: { label: "وافق العميل", color: "bg-primary-50 text-primary-700" },
  CONVERTED: { label: "تم التحويل", color: "bg-gray-100 text-gray-600" },
  REJECTED: { label: "مرفوض", color: "bg-red-50 text-red-600" },
};

export default async function ServiceRequestsPage() {
  const requests = await prisma.serviceRequest.findMany({
    include: { client: true, quotation: true, documents: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">طلبات الخدمة</h1>
        <p className="text-gray-500 text-sm mt-1">طلبات واردة من رابط تسجيل العملاء</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">العميل</th>
              <th className="text-right px-5 py-3 font-medium">النوع</th>
              <th className="text-right px-5 py-3 font-medium">التفاصيل</th>
              <th className="text-right px-5 py-3 font-medium">المستندات</th>
              <th className="text-right px-5 py-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const status = r.quotation?.status === "ACCEPTED" && r.status !== "CONVERTED" ? "ACCEPTED" : r.status;
              return (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
                  <td className="px-5 py-3">
                    <Link href={`/service-requests/${r.id}`} className="font-medium text-primary-700 hover:underline">
                      {r.client.name}
                    </Link>
                    <p className="text-xs text-gray-400" dir="ltr">{r.client.phone}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{typeLabels[r.requestType]}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{r.notes || "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{r.documents.length}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[status].color}`}>
                      {statusLabels[status].label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                  لا توجد طلبات خدمة بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
