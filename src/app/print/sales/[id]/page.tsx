import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "../../PrintButton";
import { generateZatcaQrDataUrl } from "@/lib/zatca";

export default async function PrintSalePage({ params }: { params: { id: string } }) {
  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({
      where: { id: params.id },
      include: { client: true, case: true },
    }),
    prisma.officeSettings.findFirst(),
  ]);

  if (!sale) notFound();

  const qrDataUrl =
    settings?.taxNumber && settings?.officeName
      ? await generateZatcaQrDataUrl({
          sellerName: settings.officeName,
          vatNumber: settings.taxNumber,
          invoiceTimestamp: sale.saleDate,
          invoiceTotal: sale.totalAmount,
          vatTotal: sale.applyVat ? sale.vatAmount : 0,
        })
      : null;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white py-10 px-4" dir="rtl">
      <PrintButton />
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm print:shadow-none border border-gray-100 print:border-0 p-10">
        {(settings?.officeName || settings?.logoUrl) && (
          <div className="flex items-center gap-3 border-b border-gray-100 pb-6 mb-6">
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="" className="w-14 h-14 object-contain" />
            )}
            <div>
              {settings.officeName && <p className="text-lg font-bold text-ink">{settings.officeName}</p>}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {settings.taxNumber && <span>الرقم الضريبي: {settings.taxNumber}</span>}
                {settings.phone && <span>{settings.phone}</span>}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between border-b border-gray-100 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">فاتورة</h1>
            <p className="text-sm text-gray-500 mt-1">رقم الفاتورة: {sale.invoiceNumber}</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-500">التاريخ</p>
            <p className="text-sm font-medium text-ink">
              {new Date(sale.saleDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs text-gray-400 mb-1">العميل</p>
            <p className="text-sm font-bold text-ink">{sale.client.name}</p>
            {sale.client.phone && <p className="text-xs text-gray-500 mt-1">{sale.client.phone}</p>}
            {sale.client.address && <p className="text-xs text-gray-500">{sale.client.address}</p>}
          </div>
          {sale.case && (
            <div>
              <p className="text-xs text-gray-400 mb-1">القضية</p>
              <p className="text-sm font-bold text-ink">{sale.case.caseNumber}</p>
              <p className="text-xs text-gray-500 mt-1">{sale.case.title}</p>
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
              <td className="py-3 text-ink">{sale.description}</td>
              <td className="py-3 text-left text-ink">{sale.amount.toLocaleString()} ر.س</td>
            </tr>
            {sale.applyVat && (
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-500">ضريبة القيمة المضافة (15%)</td>
                <td className="py-3 text-left text-gray-500">{sale.vatAmount.toLocaleString()} ر.س</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-3 font-bold text-ink">الإجمالي</td>
              <td className="py-3 text-left font-bold text-primary-700">{sale.totalAmount.toLocaleString()} ر.س</td>
            </tr>
          </tfoot>
        </table>

        <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            حالة الدفع:{" "}
            <span className="font-medium text-ink">
              {sale.paymentStatus === "PAID" ? "مدفوعة" : sale.paymentStatus === "PARTIAL" ? "مدفوعة جزئياً" : "غير مدفوعة"}
            </span>
          </p>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="ZATCA QR" className="w-24 h-24" />
          )}
        </div>

        {!qrDataUrl && (
          <p className="text-[11px] text-amber-600 mt-4 text-center">
            💡 لإظهار رمز الفوترة الإلكترونية، أضف "الرقم الضريبي" و"اسم المكتب" من صفحة الإعدادات.
          </p>
        )}
      </div>
    </div>
  );
}
