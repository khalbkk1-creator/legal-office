import { prisma } from "@/lib/prisma";
import PrintButton from "../../PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintAgingPage() {
  const [sales, settings] = await Promise.all([
    prisma.sale.findMany({
      where: { paymentStatus: { not: "PAID" } },
      include: { client: true },
      orderBy: { saleDate: "asc" },
    }),
    prisma.officeSettings.findFirst(),
  ]);

  const now = new Date();
  const rows = sales
    .filter((s) => s.totalAmount - s.paidAmount > 0.01)
    .map((s) => {
      const days = Math.max(0, Math.floor((now.getTime() - s.saleDate.getTime()) / (1000 * 60 * 60 * 24)));
      const bucket = days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "أكثر من 90";
      return { sale: s, days, bucket, outstanding: s.totalAmount - s.paidAmount };
    })
    .sort((a, b) => b.days - a.days);

  const total = rows.reduce((s, r) => s + r.outstanding, 0);
  const today = now.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white py-10 px-4" dir="rtl">
      <PrintButton />
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm print:shadow-none border border-gray-100 print:border-0 p-10">
        {(settings?.officeName || settings?.logoUrl) && (
          <div className="flex items-center gap-3 border-b border-gray-100 pb-6 mb-6">
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="" className="w-14 h-14 object-contain" />
            )}
            <div>
              {settings.officeName && <p className="text-lg font-bold text-ink">{settings.officeName}</p>}
              {settings.taxNumber && <p className="text-xs text-gray-400">الرقم الضريبي: {settings.taxNumber}</p>}
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-ink mb-1">تقرير أعمار الديون</h1>
        <p className="text-sm text-gray-500 mb-6">كما في تاريخ {today}</p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-xs">
              <th className="text-right py-2">الفاتورة</th>
              <th className="text-right py-2">العميل</th>
              <th className="text-right py-2">عدد الأيام</th>
              <th className="text-right py-2">الفئة</th>
              <th className="text-right py-2">المبلغ المستحق</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sale.id} className="border-b border-gray-100">
                <td className="py-2">{r.sale.invoiceNumber}</td>
                <td className="py-2">{r.sale.client.name}</td>
                <td className="py-2">{r.days} يوم</td>
                <td className="py-2">{r.bucket}</td>
                <td className="py-2 font-medium">{r.outstanding.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-bold">
              <td colSpan={4} className="py-2">الإجمالي</td>
              <td className="py-2">{total.toLocaleString()} ر.س</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
