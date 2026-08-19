import { prisma } from "@/lib/prisma";

const caseStatusLabels: Record<string, string> = {
  UNDER_REVIEW: "تحت الدراسة",
  UNDER_APPROVAL: "تحت الاعتماد",
  ACTIVE: "جارية",
  ON_HOLD: "معلقة",
  CLOSED: "مغلقة",
};

const consultationTypeLabels: Record<string, string> = {
  PHONE: "📞 استشارة هاتفية",
  IN_PERSON: "🏢 استشارة حضورية",
  WRITTEN: "✍️ استشارة كتابية",
};

const consultationStatusLabels: Record<string, string> = {
  PENDING: "بانتظار المراجعة",
  CONFIRMED: "مؤكدة",
  DONE: "منتهية",
  CANCELLED: "ملغاة",
};

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-ink font-medium">{count}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const [
    totalClients,
    activeClientsCount,
    totalCases,
    casesByStatus,
    casesByType,
    totalConsultations,
    consultationsByType,
    consultationsByStatus,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({
      where: { cases: { some: { status: { not: "CLOSED" } } } },
    }),
    prisma.case.count(),
    prisma.case.groupBy({ by: ["status"], _count: true }),
    prisma.case.groupBy({ by: ["caseType"], _count: true }),
    prisma.consultationRequest.count(),
    prisma.consultationRequest.groupBy({ by: ["consultationType"], _count: true }),
    prisma.consultationRequest.groupBy({ by: ["status"], _count: true }),
  ]);

  const caseTypeSorted = [...casesByType].sort((a, b) => b._count - a._count);
  const maxCaseType = Math.max(1, ...caseTypeSorted.map((c) => c._count));
  const maxCaseStatus = Math.max(1, ...casesByStatus.map((c) => c._count));

  const consultationTypeSorted = [...consultationsByType].sort((a, b) => b._count - a._count);
  const maxConsultationType = Math.max(1, ...consultationTypeSorted.map((c) => c._count));
  const maxConsultationStatus = Math.max(1, ...consultationsByStatus.map((c) => c._count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">الإحصائيات</h1>
        <p className="text-gray-500 text-sm mt-1">نظرة رقمية شاملة على نشاط المكتب</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">إجمالي العملاء</p>
          <p className="text-3xl font-bold text-ink">{totalClients}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">العملاء النشطون</p>
          <p className="text-3xl font-bold text-primary-700">{activeClientsCount}</p>
          <p className="text-xs text-gray-400 mt-1">لديهم قضية غير مغلقة</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">إجمالي القضايا</p>
          <p className="text-3xl font-bold text-ink">{totalCases}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-1">إجمالي الاستشارات</p>
          <p className="text-3xl font-bold text-ink">{totalConsultations}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-4">القضايا حسب الحالة</h2>
          {casesByStatus.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد قضايا مسجّلة بعد.</p>
          ) : (
            <div className="space-y-3">
              {casesByStatus.map((c) => (
                <Bar key={c.status} label={caseStatusLabels[c.status] ?? c.status} count={c._count} max={maxCaseStatus} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-4">القضايا حسب النوع</h2>
          {caseTypeSorted.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد قضايا مسجّلة بعد.</p>
          ) : (
            <div className="space-y-3">
              {caseTypeSorted.map((c) => (
                <Bar key={c.caseType} label={c.caseType} count={c._count} max={maxCaseType} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-4">الاستشارات حسب النوع</h2>
          {consultationTypeSorted.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد استشارات مسجّلة بعد.</p>
          ) : (
            <div className="space-y-3">
              {consultationTypeSorted.map((c) => (
                <Bar
                  key={c.consultationType ?? "unknown"}
                  label={c.consultationType ? consultationTypeLabels[c.consultationType] ?? c.consultationType : "غير محدد"}
                  count={c._count}
                  max={maxConsultationType}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-4">الاستشارات حسب الحالة</h2>
          {consultationsByStatus.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد استشارات مسجّلة بعد.</p>
          ) : (
            <div className="space-y-3">
              {consultationsByStatus.map((c) => (
                <Bar key={c.status} label={consultationStatusLabels[c.status] ?? c.status} count={c._count} max={maxConsultationStatus} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
