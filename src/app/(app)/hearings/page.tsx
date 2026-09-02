import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HearingRow = {
  id: string;
  date: Date;
  court: string | null;
  roundNumber: number | null;
  outcome: string | null;
  isFinalRuling: boolean;
  case: { id: string; title: string; caseNumber: string; court: string | null; client: { name: string }; lawyer: { name: string } | null };
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function HearingsPage() {
  const hearings = (await prisma.hearing.findMany({
    include: { case: { include: { client: true, lawyer: true } } },
    orderBy: { date: "asc" },
  })) as unknown as HearingRow[];

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);

  const upcoming = hearings.filter((h) => h.date >= today);
  const past = hearings.filter((h) => h.date < today).reverse().slice(0, 30);

  const groups = [
    { key: "today", title: "اليوم", items: upcoming.filter((h) => h.date < tomorrow) },
    { key: "tomorrow", title: "غداً", items: upcoming.filter((h) => h.date >= tomorrow && h.date < new Date(tomorrow.getTime() + 86400000)) },
    { key: "week", title: "هذا الأسبوع", items: upcoming.filter((h) => h.date >= new Date(tomorrow.getTime() + 86400000) && h.date < weekEnd) },
    { key: "later", title: "لاحقاً", items: upcoming.filter((h) => h.date >= weekEnd) },
  ].filter((g) => g.items.length > 0);

  const stats = [
    { label: "اليوم", value: upcoming.filter((h) => h.date < tomorrow).length, tone: "text-red-600" },
    { label: "خلال 7 أيام", value: upcoming.filter((h) => h.date < weekEnd).length, tone: "text-amber-600" },
    { label: "إجمالي القادمة", value: upcoming.length, tone: "text-ink" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">الجلسات</h1>
        <p className="text-gray-500 text-sm mt-1">أجندة جلسات المحكمة لكل القضايا</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className={`text-2xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-6">
        {groups.map((g) => (
          <div key={g.key}>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">{g.title}</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
              {g.items.map((h) => (
                <HearingLine key={h.id} h={h} urgent={g.key === "today" || g.key === "tomorrow"} />
              ))}
            </div>
          </div>
        ))}
        {upcoming.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
            <p className="text-ink font-medium">لا توجد جلسات قادمة</p>
            <p className="text-sm text-gray-500 mt-1">تُضاف الجلسات من داخل صفحة كل قضية.</p>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">الجلسات السابقة</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
            {past.map((h) => (
              <HearingLine key={h.id} h={h} past />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HearingLine({ h, urgent = false, past = false }: { h: HearingRow; urgent?: boolean; past?: boolean }) {
  const d = new Date(h.date);
  const day = d.toLocaleDateString("ar-SA", { day: "numeric" });
  const month = d.toLocaleDateString("ar-SA", { month: "short" });
  const weekday = d.toLocaleDateString("ar-SA", { weekday: "long" });
  const time = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const court = h.court ?? h.case.court;

  return (
    <Link href={`/cases/${h.case.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-primary-50/30 transition">
      <div
        className={`w-14 shrink-0 rounded-xl text-center py-2 ${
          past ? "bg-gray-100 text-gray-500" : urgent ? "bg-red-50 text-red-700" : "bg-primary-50 text-primary-800"
        }`}
      >
        <p className="text-xl font-bold leading-none tabular-nums">{day}</p>
        <p className="text-[11px] mt-1">{month}</p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink truncate">{h.case.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {h.case.client.name}
          {h.case.lawyer && <> · {h.case.lawyer.name}</>}
          {court && <> · {court}</>}
          {h.roundNumber && <> · الجولة {h.roundNumber}</>}
        </p>
        {past && h.outcome && (
          <p className="text-xs text-gray-700 mt-1">
            {h.isFinalRuling && <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium ml-1">حكم نهائي</span>}
            {h.outcome}
          </p>
        )}
      </div>

      <div className="text-left shrink-0">
        <p className="text-sm text-ink">{weekday}</p>
        <p className="text-xs text-gray-400 tabular-nums" dir="ltr">
          {time}
        </p>
      </div>
    </Link>
  );
}
