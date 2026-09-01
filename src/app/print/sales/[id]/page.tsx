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
    <div className="min-h-screen bg-gray-100 print:bg-white py-10 px-4" dir="rtl">
      <PrintButton />
      <div className="max-w-3xl mx-auto bg-white shadow-xl print:shadow-none rounded-3xl print:rounded-none overflow-hidden">
        {/* شريط علوي بالهوية */}
        <div className="bg-primary-700 text-white px-10 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="" className="w-16 h-16 object-contain bg-white rounded-xl p-1.5" />
            )}
            <div>
              <p className="text-xl font-bold">{settings?.officeName || "مكتب المحاماة"}</p>
              {settings?.taxNumber && (
                <p className="text-xs text-primary-100 mt-1">الرقم الضريبي: {settings.taxNumber}</p>
              )}
            </div>
          </div>
          <div className="text-left">
            <p className="text-3xl font-extrabold tracking-wide">فاتورة</p>
            <p className="text-xs text-primary-100 mt-1">TAX INVOICE</p>
          </div>
        </div>

        <div className="p-10">
          {/* رقم الفاتورة والتاريخ */}
          <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6 mb-8">
            <div>
              <p className="text-xs text-gray-400 mb-1">رقم الفاتورة</p>
              <p className="text-lg font-bold text-ink">{sale.invoiceNumber}</p>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 mb-1">تاريخ الإصدار</p>
              <p className="text-lg font-bold text-ink">
                {new Date(sale.saleDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* مقدم الخدمة والعميل جنب بعض */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="bg-gray-50 rounded-2xl p-6">
              <p className="text-xs font-bold text-primary-700 mb-3 tracking-wide">مقدم الخدمة</p>
              <p className="text-base font-bold text-ink mb-1">{settings?.officeName || "—"}</p>
              <div className="space-y-1 text-sm text-gray-600">
                {settings?.taxNumber && <p>الرقم الضريبي: {settings.taxNumber}</p>}
                {settings?.phone && <p dir="ltr" className="text-right">{settings.phone}</p>}
                {settings?.address && <p>{settings.address}</p>}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <p className="text-xs font-bold text-primary-700 mb-3 tracking-wide">العميل</p>
              <p className="text-base font-bold text-ink mb-1">{sale.client.name}</p>
              <div className="space-y-1 text-sm text-gray-600">
                {sale.client.idNumber && <p>الرقم الضريبي / رقم الهوية: {sale.client.idNumber}</p>}
                {sale.client.phone && <p dir="ltr" className="text-right">{sale.client.phone}</p>}
                {sale.client.email && <p dir="ltr" className="text-right">{sale.client.email}</p>}
                {sale.client.address && <p>{sale.client.address}</p>}
              </div>
            </div>
          </div>

          {sale.case && (
            <div className="mb-6 text-sm text-gray-500">
              مرتبطة بالقضية: <span className="text-ink font-medium">{sale.case.caseNumber} — {sale.case.title}</span>
            </div>
          )}

          {/* جدول البنود */}
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right py-3 px-4 rounded-r-lg">الوصف</th>
                <th className="text-left py-3 px-4 rounded-l-lg">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-4 px-4 text-ink">{sale.description}</td>
                <td className="py-4 px-4 text-left text-ink">{sale.amount.toLocaleString()} ر.س</td>
              </tr>
              {sale.applyVat && (
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-500">ضريبة القيمة المضافة (15%)</td>
                  <td className="py-4 px-4 text-left text-gray-500">{sale.vatAmount.toLocaleString()} ر.س</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* الإجمالي بارز */}
          <div className="bg-primary-50 rounded-2xl px-6 py-5 flex items-center justify-between mb-8">
            <span className="text-base font-bold text-primary-800">الإجمالي المستحق</span>
            <span className="text-2xl font-extrabold text-primary-700">{sale.totalAmount.toLocaleString()} ر.س</span>
          </div>

          {/* حالة الدفع + QR */}
          <div className="border-t-2 border-gray-100 pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">حالة الدفع</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  sale.paymentStatus === "PAID"
                    ? "bg-primary-100 text-primary-700"
                    : sale.paymentStatus === "PARTIAL"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {sale.paymentStatus === "PAID" ? "مدفوعة" : sale.paymentStatus === "PARTIAL" ? "مدفوعة جزئياً" : "غير مدفوعة"}
              </span>
            </div>

            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="ZATCA QR" className="w-28 h-28" />
            ) : (
              <p className="text-[11px] text-amber-600 max-w-[180px] text-left">
                💡 لإظهار رمز الفوترة الإلكترونية، أضف "الرقم الضريبي" و"اسم المكتب" من صفحة الإعدادات.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
