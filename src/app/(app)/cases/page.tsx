import Link from "next/link";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "مفتوحة", color: "bg-amber-50 text-amber-700" },
  ACTIVE: { label: "جارية", color: "bg-primary-50 text-primary-700" },
  ON_HOLD: { label: "متوقفة", color: "bg-gray-100 text-gray-600" },
  CLOSED: { label: "منتهية", color: "bg-red-50 text-red-600" },
};

export default async function CasesPage() {
  const cases = await prisma.case.findMany({
    include: { client: true, lawyer: true, _count: { select: { hearings: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">القضايا</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة كافة قضايا المكتب</p>
        </div>
        <Link
          href="/cases/new"
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          + قضية جديدة
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">رقم القضية</th>
              <th className="text-right px-5 py-3 font-medium">الموضوع</th>
              <th className="text-right px-5 py-3 font-medium">العميل</th>
              <th className="text-right px-5 py-3 font-medium">المحامي</th>
              <th className="text-right px-5 py-3 font-medium">الحالة</th>
              <th className="text-right px-5 py-3 font-medium">الجلسات</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
                <td className="px-5 py-3">
                  <Link href={`/cases/${c.id}`} className="font-medium text-primary-700">
                    {c.caseNumber}
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink">{c.title}</td>
                <td className="px-5 py-3 text-gray-600">{c.client.name}</td>
                <td className="px-5 py-3 text-gray-600">{c.lawyer?.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[c.status].color}`}
                  >
                    {statusLabels[c.status].label}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">{c._count.hearings}</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                  لا توجد قضايا مسجّلة بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
