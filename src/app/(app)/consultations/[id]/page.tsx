import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ConsultationNotes from "./ConsultationNotes";
import ConsultationResponseUpload from "./ConsultationResponseUpload";
import ConsultationActions from "../ConsultationActions";

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "بانتظار المراجعة", color: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "تم التأكيد", color: "bg-primary-50 text-primary-700" },
  DONE: { label: "تمت الاستشارة", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "ملغاة", color: "bg-red-50 text-red-600" },
};

const consultationTypeLabels: Record<string, string> = {
  PHONE: "📞 استشارة هاتفية",
  IN_PERSON: "🏢 استشارة حضورية",
  WRITTEN: "✍️ استشارة كتابية",
};

export default async function ConsultationDetailPage({ params }: { params: { id: string } }) {
  const consultation = await prisma.consultationRequest.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      sale: true,
      noteLog: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!consultation) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">ملف الاستشارة</h1>
          <p className="text-gray-500 text-sm mt-1">{consultation.name}</p>
        </div>
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusLabels[consultation.status].color}`}>
          {statusLabels[consultation.status].label}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-3">بيانات العميل</h2>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400">الاسم:</span> {consultation.name}</p>
          <p dir="ltr" className="text-right"><span className="text-gray-400">الجوال:</span> {consultation.phone}</p>
          {consultation.email && <p dir="ltr" className="text-right"><span className="text-gray-400">البريد:</span> {consultation.email}</p>}
        </div>
        {consultation.client && (
          <Link href="/clients" className="text-xs text-primary-700 hover:underline mt-2 inline-block">
            عرض ملف العميل الكامل ←
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-3">تفاصيل الموعد</h2>
        <div className="space-y-1 text-sm">
          {consultation.consultationType && (
            <p><span className="text-gray-400">النوع:</span> {consultationTypeLabels[consultation.consultationType]}</p>
          )}
          <p>
            <span className="text-gray-400">الموعد:</span>{" "}
            {new Date(consultation.requestedDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
            {" — "}
            {new Date(consultation.requestedDate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {consultation.sale && (
            <p>
              <span className="text-gray-400">الفاتورة:</span> {consultation.sale.invoiceNumber} —{" "}
              <span className="font-bold text-primary-700">{consultation.sale.totalAmount.toLocaleString()} ر.س</span>
              {" "}
              <Link href="/sales" className="text-xs text-primary-700 hover:underline">(عرض)</Link>
            </p>
          )}
        </div>
        {consultation.notes && (
          <p className="text-sm text-gray-600 leading-relaxed mt-3 border-t border-gray-50 pt-3">{consultation.notes}</p>
        )}
      </div>

      {consultation.attachmentUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-2">مرفق العميل عند الحجز</h2>
          <a href={consultation.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-700 hover:underline">
            📄 {consultation.attachmentName}
          </a>
        </div>
      )}

      {consultation.consultationType === "WRITTEN" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-3">رد الاستشارة الكتابية</h2>
          <p className="text-xs text-gray-400 mb-3">
            ارفع الرد المكتوب هنا، وراح يظهر للعميل مباشرة في بوابته الخاصة.
          </p>
          <ConsultationResponseUpload
            consultationId={consultation.id}
            existingUrl={consultation.responseFileUrl}
            existingName={consultation.responseFileName}
          />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-3">إجراءات</h2>
        <ConsultationActions requestId={consultation.id} status={consultation.status} />
      </div>

      <ConsultationNotes
        consultationId={consultation.id}
        notes={consultation.noteLog.map((n) => ({
          id: n.id,
          note: n.note,
          authorName: n.author?.name ?? "—",
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
