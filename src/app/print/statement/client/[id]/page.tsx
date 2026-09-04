import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "../../../PrintButton";

export const dynamic = "force-dynamic";

// كشف حساب عميل — رصيد افتتاحي، الحركات، الرصيد الجاري. الفترة عبر ?from=&to=
export default async function ClientStatementPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { from?: string; to?: string };
}) {
  const to = searchParams?.to ? new Date(searchParams.to + "T23:59:59") : new Date();
  const from = searchParams?.from ? new Date(searchParams.from + "T00:00:00") : new Date(to.getFullYear(), 0, 1);

  const [client, settings] = await Promise.all([
    prisma.client.findUnique({ where: { id: params.id } }),
    prisma.officeSettings.findFirst(),
  ]);
  if (!client) notFound();

  const [salesBefore, sales] = await Promise.all([
    prisma.sale.aggregate({ where: { clientId: client.id, saleDate: { lt: from } }, _sum: { totalAmount: true, paidAmount: true } }),
    prisma.sale.findMany({ where: { clientId: client.id, saleDate: { gte: from, lte: to } }, orderBy: { saleDate: "asc" } }),
  ]);

  const opening = (salesBefore._sum.totalAmount ?? 0) - (salesBefore._sum.paidAmount ?? 0);

  type Row = { date: Date; ref: string; desc: string; debit: number; credit: number };
  const rows: Row[] = [];
  for (const s of sales) {
    rows.push({ date: s.saleDate, ref: s.invoiceNumber, desc: s.description, debit: s.totalAmount, credit: 0 });
    if (s.paidAmount > 0) {
      rows.push({ date: s.saleDate, ref: s.invoiceNumber, desc: "مدفوعات على الفاتورة", debit: 0, credit: s.paidAmount });
    }
  }
  rows.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = opening;
  const withRunning = rows.map((r) => {
    running += r.debit - r.credit;
    return { ...r, running };
  });
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  const fmt = (d: Date) => d.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white py-10 px-4" dir="rtl">
      <PrintButton />
      <div className="max-w-4xl mx-auto bg-white shadow-xl print:shadow-none rounded-3xl print:rounded-none overflow-hidden">
        <div className="bg-primary-700 text-white px-10 py-7 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="" className="w-14 h-14 object-contain bg-white rounded-xl p-1.5" />
            )}
            <div>
              <p className="text-lg font-bold">{settings?.officeName || "مكتب المحاماة"}</p>
              {settings?.taxNumber && <p className="text-xs text-primary-100 mt-0.5">الرقم الضريبي: {settings.taxNumber}</p>}
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-extrabold">كشف حساب</p>
            <p className="text-xs text-primary-100 mt-1">STATEMENT OF ACCOUNT</p>
          </div>
        </div>

        <div className="p-10">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 rounded-2xl p-5">
              <p className="text-xs font-bold text-primary-700 mb-2">العميل</p>
              <p className="text-base font-bold text-ink">{client.name}</p>
              <div className="text-sm text-gray-600 space-y-0.5 mt-1">
                {client.idNumber && <p>الرقم الضريبي / الهوية: {client.idNumber}</p>}
                {client.phone && <p dir="ltr" className="text-right">{client.phone}</p>}
                {client.address && <p>{client.address}</p>}
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5">
              <p className="text-xs font-bold text-primary-700 mb-2">الفترة</p>
              <p className="text-sm text-gray-700">من {fmt(from)}</p>
              <p className="text-sm text-gray-700">إلى {fmt(to)}</p>
              <p className="text-xs text-gray-400 mt-2">تاريخ الإصدار: {fmt(new Date())}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right py-3 px-3 rounded-r-lg">التاريخ</th>
                <th className="text-right py-3 px-3">المرجع</th>
                <th className="text-right py-3 px-3">البيان</th>
                <th className="text-right py-3 px-3">مدين</th>
                <th className="text-right py-3 px-3">دائن</th>
                <th className="text-right py-3 px-3 rounded-l-lg">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <td className="py-2.5 px-3 text-gray-500" colSpan={3}>الرصيد الافتتاحي</td>
                <td className="py-2.5 px-3">—</td>
                <td className="py-2.5 px-3">—</td>
                <td className="py-2.5 px-3 font-medium tabular-nums">{opening.toLocaleString()}</td>
              </tr>
              {withRunning.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{r.date.toLocaleDateString("ar-SA")}</td>
                  <td className="py-2.5 px-3 font-mono text-xs" dir="ltr">{r.ref}</td>
                  <td className="py-2.5 px-3 text-ink">{r.desc}</td>
                  <td className="py-2.5 px-3 tabular-nums">{r.debit > 0 ? r.debit.toLocaleString() : "—"}</td>
                  <td className="py-2.5 px-3 tabular-nums">{r.credit > 0 ? r.credit.toLocaleString() : "—"}</td>
                  <td className="py-2.5 px-3 tabular-nums font-medium">{r.running.toLocaleString()}</td>
                </tr>
              ))}
              {withRunning.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">لا توجد حركات خلال هذه الفترة.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="py-3 px-3" colSpan={3}>الإجمالي</td>
                <td className="py-3 px-3 tabular-nums">{totalDebit.toLocaleString()}</td>
                <td className="py-3 px-3 tabular-nums">{totalCredit.toLocaleString()}</td>
                <td className="py-3 px-3 tabular-nums">{running.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <div className="bg-primary-50 rounded-2xl px-6 py-5 flex items-center justify-between">
            <span className="text-base font-bold text-primary-800">الرصيد المستحق علينا/عليكم</span>
            <span className="text-2xl font-extrabold text-primary-700 tabular-nums">{running.toLocaleString()} ر.س</span>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-10 text-xs text-gray-500">
            <div className="border-t border-gray-200 pt-2">أُعد بواسطة</div>
            <div className="border-t border-gray-200 pt-2">اعتُمد من</div>
          </div>
        </div>
      </div>
    </div>
  );
}
