import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HearingsPage() {
  const hearings = await prisma.hearing.findMany({
    include: { case: { include: { client: true, lawyer: true } } },
    orderBy: { date: "asc" },
  });

  const now = new Date();
  const upcoming = hearings.filter((h) => h.date >= now);
  const past = hearings.filter((h) => h.date < now).reverse();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">الجلسات</h1>
        <p className="text-gray-500 text-sm mt-1">جميع جلسات المحكمة المسجّلة</p>
      </div>

      <Section title="الجلسات القادمة" items={upcoming} emptyText="لا توجد جلسات قادمة." />
      <Section title="الجلسات السابقة" items={past} emptyText="لا توجد جلسات سابقة." />
    </div>
  );
}

function Section({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Awaited<ReturnType<typeof prisma.hearing.findMany>>;
  emptyText: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-4">{title}</h2>
      <div className="space-y-3">
        {items.map((h: any) => (
          <Link
            key={h.id}
            href={`/cases/${h.case.id}`}
            className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-3 last:pb-0"
          >
            <div>
              <p className="text-sm font-medium text-ink">{h.case.title}</p>
              <p className="text-xs text-gray-400">
                {h.case.client.name} · {h.court ?? h.case.court ?? "—"} · {h.case.lawyer?.name ?? "غير معيّن"}
              </p>
            </div>
            <p className="text-sm text-primary-700 font-medium whitespace-nowrap">
              {new Date(h.date).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </Link>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">{emptyText}</p>}
      </div>
    </div>
  );
}
