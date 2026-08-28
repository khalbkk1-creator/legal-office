import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "../../../PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintLedgerPage({ params }: { params: { accountId: string } }) {
  const [account, settings] = await Promise.all([
    prisma.account.findUnique({ where: { id: params.accountId } }),
    prisma.officeSettings.findFirst(),
  ]);
  if (!account) notFound();

  const lines = await prisma.journalEntryLine.findMany({
    where: { accountId: params.accountId, journalEntry: { status: "POSTED" } },
    include: { journalEntry: true },
    orderBy: [{ journalEntry: { date: "asc" } }, { journalEntry: { entryNumber: "asc" } }],
  });

  const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
  let running = 0;
  const rows = lines.map((l) => {
    running += isDebitNormal ? l.debit - l.credit : l.credit - l.debit;
    return { ...l, runningBalance: running };
  });

  const today = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

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

        <h1 className="text-2xl font-bold text-ink mb-1">دفتر الأستاذ — {account.code} {account.name}</h1>
        <p className="text-sm text-gray-500 mb-6">حتى تاريخ {today}</p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-xs">
              <th className="text-right py-2">التاريخ</th>
              <th className="text-right py-2">رقم القيد</th>
              <th className="text-right py-2">البيان</th>
              <th className="text-right py-2">مدين</th>
              <th className="text-right py-2">دائن</th>
              <th className="text-right py-2">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-500">{r.journalEntry.date.toLocaleDateString("ar-SA")}</td>
                <td className="py-2 text-gray-500">{r.journalEntry.entryNumber}</td>
                <td className="py-2 text-ink">{r.description || r.journalEntry.description}</td>
                <td className="py-2">{r.debit > 0 ? r.debit.toLocaleString() : ""}</td>
                <td className="py-2">{r.credit > 0 ? r.credit.toLocaleString() : ""}</td>
                <td className="py-2 font-medium">{r.runningBalance.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">لا توجد حركات على هذا الحساب.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
