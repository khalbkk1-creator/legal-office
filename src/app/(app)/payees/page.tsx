import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PayeesPage() {
  const payees = await prisma.payee.findMany({
    include: { account: true },
    orderBy: { name: "asc" },
  });

  const accountIds = payees.map((p) => p.accountId);
  const sums = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: { accountId: { in: accountIds }, journalEntry: { status: "POSTED" } },
    _sum: { debit: true, credit: true },
  });
  const balanceByAccount: Record<string, number> = {};
  for (const s of sums) {
    // حساب المستفيد من نوع LIABILITY: الرصيد الطبيعي دائن، فلو صار مدين (دفعات بدون فواتير) يبين هنا كرقم سالب
    balanceByAccount[s.accountId] = (s._sum.credit ?? 0) - (s._sum.debit ?? 0);
  }

  const [requestCounts] = await Promise.all([
    prisma.paymentRequest.groupBy({ by: ["payeeId"], _count: true }),
  ]);
  const countByPayee: Record<string, number> = {};
  for (const c of requestCounts) countByPayee[c.payeeId] = c._count;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">المستفيدون (الموردون/الجهات)</h1>
          <p className="text-gray-500 text-sm mt-1">قاعدة بيانات كل الجهات والأشخاص المستفيدين من طلبات الصرف</p>
        </div>
        <Link
          href="/payment-requests"
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          ← طلبات الصرف
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">الاسم</th>
              <th className="text-right px-5 py-3 font-medium">النوع</th>
              <th className="text-right px-5 py-3 font-medium">الجوال</th>
              <th className="text-right px-5 py-3 font-medium">عدد الطلبات</th>
              <th className="text-right px-5 py-3 font-medium">الرصيد الحالي</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {payees.map((p) => {
              const balance = balanceByAccount[p.accountId] ?? 0;
              return (
                <tr key={p.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-5 py-3 text-gray-600">{p.type === "COMPANY" ? "جهة/شركة" : "فرد"}</td>
                  <td className="px-5 py-3 text-gray-600" dir="ltr">{p.phone || "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{countByPayee[p.id] ?? 0}</td>
                  <td className={`px-5 py-3 font-medium ${balance < 0 ? "text-amber-600" : "text-ink"}`}>
                    {balance.toLocaleString()} ر.س
                    {balance < 0 && <span className="text-xs text-amber-500 mr-1">(دفعات بانتظار فواتير)</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/accounting/ledger/${p.accountId}`} className="text-xs text-primary-700 hover:underline">
                      دفتر الأستاذ
                    </Link>
                  </td>
                </tr>
              );
            })}
            {payees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                  لا يوجد مستفيدون مسجّلون بعد. يُضافون تلقائياً عند إنشاء أول طلب صرف لهم.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
