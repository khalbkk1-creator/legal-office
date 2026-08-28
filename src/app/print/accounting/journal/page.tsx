import { prisma } from "@/lib/prisma";
import PrintButton from "../../PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintJournalPage() {
  const [entries, settings] = await Promise.all([
    prisma.journalEntry.findMany({
      include: { lines: { include: { account: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.officeSettings.findFirst(),
  ]);

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

        <h1 className="text-2xl font-bold text-ink mb-1">دفتر اليومية</h1>
        <p className="text-sm text-gray-500 mb-6">حتى تاريخ {today}</p>

        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.id} className="break-inside-avoid">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold text-ink">{e.entryNumber} — {e.description}</span>
                <span className="text-gray-500">{e.date.toLocaleDateString("ar-SA")}</span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {e.lines.map((l) => (
                    <tr key={l.id} className="border-b border-gray-50">
                      <td className="py-1 text-gray-700">{l.account.code} — {l.account.name}</td>
                      <td className="py-1 text-left w-24">{l.debit > 0 ? l.debit.toLocaleString() : ""}</td>
                      <td className="py-1 text-left w-24">{l.credit > 0 ? l.credit.toLocaleString() : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-gray-400 text-center py-10">لا توجد قيود مرحّلة بعد.</p>}
        </div>
      </div>
    </div>
  );
}
