import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "../../PrintButton";

const statusLabels: Record<string, string> = {
  PENDING: "بانتظار الرد",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  EXPIRED: "منتهي الصلاحية",
};

export default async function PrintQuotePage({ params }: { params: { id: string } }) {
  const quote = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: { client: true, case: true },
  });

  if (!quote) notFound();

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white py-10 px-4" dir="rtl">
      <PrintButton />
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm print:shadow-none border border-gray-100 print:border-0 p-10">
        <div className="flex items-start justify-between border-b border-gray-100 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">عرض سعر</h1>
            <p className="text-sm text-gray-500 mt-1">رقم العرض: {quote.quoteNumber}</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-500">التاريخ</p>
            <p className="text-sm font-medium text-ink">
              {new Date(quote.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            {quote.validUntil && (
              <>
                <p className="text-sm text-gray-500 mt-2">صالح حتى</p>
                <p className="text-sm font-medium text-ink">
                  {new Date(quote.validUntil).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs text-gray-400 mb-1">العميل</p>
            <p className="text-sm font-bold text-ink">{quote.client.name}</p>
            {quote.client.phone && <p className="text-xs text-gray-500 mt-1">{quote.client.phone}</p>}
            {quote.client.address && <p className="text-xs text-gray-500">{quote.client.address}</p>}
          </div>
          {quote.case && (
            <div>
              <p className="text-xs text-gray-400 mb-1">القضية</p>
              <p className="text-sm font-bold text-ink">{quote.case.caseNumber}</p>
              <p className="text-xs text-gray-500 mt-1">{quote.case.title}</p>
            </div>
          )}
        </div>

        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-xs">
              <th className="text-right py-2">الوصف</th>
              <th className="text-left py-2">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3 text-ink">{quote.description}</td>
              <td className="py-3 text-left text-ink">{quote.amount.toLocaleString()} ر.س</td>
            </tr>
            {quote.applyVat && (
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-500">ضريبة القيمة المضافة (15%)</td>
                <td className="py-3 text-left text-gray-500">{quote.vatAmount.toLocaleString()} ر.س</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-3 font-bold text-ink">الإجمالي</td>
              <td className="py-3 text-left font-bold text-primary-700">{quote.totalAmount.toLocaleString()} ر.س</td>
            </tr>
          </tfoot>
        </table>

        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400">
            الحالة: <span className="font-medium text-ink">{statusLabels[quote.status]}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
