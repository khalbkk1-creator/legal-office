import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const [underReviewCases, underApprovalCases, activeCases, totalClients, upcomingHearings, appealCases] = await Promise.all([
    prisma.case.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.case.count({ where: { status: "UNDER_APPROVAL" } }),
    prisma.case.count({ where: { status: "ACTIVE" } }),
    prisma.client.count(),
    prisma.hearing.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 5,
      include: { case: { include: { client: true } } },
    }),
    prisma.case.findMany({
      where: { appealDeadline: { not: null } },
      orderBy: { appealDeadline: "asc" },
      include: { client: true },
    }),
  ]);

  const stats = [
    { label: "تحت الدراسة", value: underReviewCases, color: "bg-blue-50 text-blue-700" },
    { label: "تحت الاعتماد", value: underApprovalCases, color: "bg-purple-50 text-purple-700" },
    { label: "قضايا جارية", value: activeCases, color: "bg-primary-50 text-primary-700" },
    { label: "إجمالي العملاء", value: totalClients, color: "bg-gray-100 text-gray-700" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">لوحة التحكم</h1>
        <p className="text-gray-500 text-sm mt-1">نظرة عامة على نشاط المكتب</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium mb-3 ${s.color}`}>
              {s.label}
            </p>
            <p className="text-3xl font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-4">أقرب الجلسات القادمة</h2>
        {upcomingHearings.length === 0 ? (
          <p className="text-sm text-gray-400">لا توجد جلسات قادمة مسجّلة.</p>
        ) : (
          <div className="space-y-3">
            {upcomingHearings.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-3 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{h.case.title}</p>
                  <p className="text-xs text-gray-400">
                    {h.case.client.name} · {h.court ?? h.case.court ?? "—"}
                  </p>
                </div>
                <p className="text-sm text-primary-700 font-medium">
                  {new Date(h.date).toLocaleDateString("ar-SA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-4">تحذيرات مواعيد الاستئناف</h2>
        {appealCases.length === 0 ? (
          <p className="text-sm text-gray-400">لا توجد مواعيد استئناف مسجّلة.</p>
        ) : (
          <div className="space-y-3">
            {appealCases.map((c) => {
              const badge = appealBadge(c.appealDeadline as Date);
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-3 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{c.title}</p>
                    <p className="text-xs text-gray-400">
                      {c.client.name} · {c.caseNumber}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className={`text-sm ${badge.className}`}>{badge.label}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.appealDeadline as Date).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function appealBadge(deadline: Date) {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "انتهى الموعد", className: "font-bold text-red-600" };
  if (days === 0) return { label: "اليوم آخر موعد", className: "font-bold text-red-600" };
  if (days <= 7) return { label: `باقي ${days} يوم`, className: "font-bold text-red-600" };
  if (days <= 14) return { label: `باقي ${days} يوم`, className: "font-bold text-amber-600" };
  return { label: `باقي ${days} يوم`, className: "font-medium text-ink" };
}
