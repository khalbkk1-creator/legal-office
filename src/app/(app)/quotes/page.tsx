import Link from "next/link";
import { prisma } from "@/lib/prisma";
import QuoteActions from "./QuoteActions";

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "بانتظار الرد", color: "bg-amber-50 text-amber-700" },
  ACCEPTED: { label: "مقبول", color: "bg-primary-50 text-primary-700" },
  REJECTED: { label: "مرفوض", color: "bg-red-50 text-red-600" },
  EXPIRED: { label: "منتهي الصلاحية", color: "bg-gray-100 text-gray-600" },
};

export default async function QuotesPage() {
  const quotes = await prisma.quotation.findMany({
    include: { client: true, case: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">عروض الأسعار</h1>
          <p className="text-gray-500 text-sm mt-1">عروض قبل تحويلها إلى فواتير</p>
        </div>
        <Link
          href="/quotes/new"
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          + عرض سعر جديد
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">رقم العرض</th>
              <th className="text-right px-5 py-3 font-medium">العميل</th>
              <th className="text-right px-5 py-3 font-medium">القضية</th>
              <th className="text-right px-5 py-3 font-medium">الوصف</th>
              <th className="text-right px-5 py-3 font-medium">الإجمالي</th>
              <th className="text-right px-5 py-3 font-medium">الحالة</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
                <td className="px-5 py-3 font-medium text-ink">{q.quoteNumber}</td>
                <td className="px-5 py-3 text-gray-600">{q.client.name}</td>
                <td className="px-5 py-3 text-gray-600">
                  {q.case ? (
                    <Link href={`/cases/${q.case.id}`} className="text-primary-700 hover:underline">
                      {q.case.caseNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3 text-gray-600">{q.description}</td>
                <td className="px-5 py-3 text-ink font-medium">{q.totalAmount.toLocaleString()} ر.س</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[q.status].color}`}>
                    {statusLabels[q.status].label}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <QuoteActions quoteId={q.id} status={q.status} converted={!!q.convertedSaleId} />
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                  لا توجد عروض أسعار مسجّلة بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
