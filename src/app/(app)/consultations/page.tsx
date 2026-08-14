import { prisma } from "@/lib/prisma";
import ConsultationActions from "./ConsultationActions";
import ClickableRow from "@/components/ClickableRow";

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "بانتظار المراجعة", color: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "تم التأكيد", color: "bg-primary-50 text-primary-700" },
  DONE: { label: "تمت الاستشارة", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "ملغاة", color: "bg-red-50 text-red-600" },
};

export default async function ConsultationsPage() {
  const requests = await prisma.consultationRequest.findMany({
    orderBy: { requestedDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">طلبات الاستشارة</h1>
        <p className="text-gray-500 text-sm mt-1">
          المواعيد المؤكدة تظهر هنا بعد تحويلها من شاشة طلبات الخدمة.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">الاسم</th>
              <th className="text-right px-5 py-3 font-medium">الجوال</th>
              <th className="text-right px-5 py-3 font-medium">الموعد المطلوب</th>
              <th className="text-right px-5 py-3 font-medium">التفاصيل</th>
              <th className="text-right px-5 py-3 font-medium">المرفق</th>
              <th className="text-right px-5 py-3 font-medium">الحالة</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <ClickableRow key={r.id} href={`/consultations/${r.id}`}>
                <td className="px-5 py-3 font-medium text-ink">{r.name}</td>
                <td className="px-5 py-3 text-gray-600" dir="ltr">{r.phone}</td>
                <td className="px-5 py-3 text-gray-600">
                  {new Date(r.requestedDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                  {" — "}
                  {new Date(r.requestedDate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{r.notes || "—"}</td>
                <td className="px-5 py-3">
                  {r.attachmentUrl ? (
                    <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline text-xs" onClick={(e) => e.stopPropagation()}>
                      📄 {r.attachmentName}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[r.status].color}`}>
                    {statusLabels[r.status].label}
                  </span>
                </td>
                <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                  <ConsultationActions requestId={r.id} status={r.status} />
                </td>
              </ClickableRow>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                  لا توجد طلبات استشارة بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
