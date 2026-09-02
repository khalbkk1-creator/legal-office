import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusMeta: Record<string, { label: string; chip: string; dot: string }> = {
  UNDER_REVIEW: { label: "تحت الدراسة", chip: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  UNDER_APPROVAL: { label: "تحت الاعتماد", chip: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  ACTIVE: { label: "جارية", chip: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
  ON_HOLD: { label: "معلقة", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  CLOSED: { label: "مغلقة", chip: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};
const STATUS_ORDER = ["ACTIVE", "UNDER_APPROVAL", "UNDER_REVIEW", "ON_HOLD", "CLOSED"] as const;

export default async function CasesPage({ searchParams }: { searchParams?: { status?: string; q?: string } }) {
  const status = searchParams?.status && statusMeta[searchParams.status] ? searchParams.status : "";
  const q = (searchParams?.q ?? "").trim();
  const now = new Date();

  const [cases, counts] = await Promise.all([
    prisma.case.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(q
          ? {
              OR: [
                { caseNumber: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { client: { name: { contains: q, mode: "insensitive" } } },
                { opposingParty: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        client: true,
        lawyer: true,
        _count: { select: { hearings: true } },
        hearings: { where: { date: { gte: now } }, orderBy: { date: "asc" }, take: 1, select: { date: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.case.groupBy({ by: ["status"], _count: true }),
  ]);

  const countByStatus: Record<string, number> = {};
  for (const c of counts) countByStatus[c.status] = c._count;
  const total = counts.reduce((s, c) => s + c._count, 0);

  const buildHref = (nextStatus: string) => {
    const p = new URLSearchParams();
    if (nextStatus) p.set("status", nextStatus);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/cases?${s}` : "/cases";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">القضايا</h1>
          <p className="text-gray-500 text-sm mt-1">{total} قضية مسجّلة</p>
        </div>
        <Link href="/cases/new" className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition shrink-0">
          + قضية جديدة
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref("")}
          className={`px-3 py-1.5 rounded-full text-sm border transition ${
            !status ? "bg-ink text-white border-ink" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
          }`}
        >
          الكل <span className="opacity-70">{total}</span>
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={buildHref(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
              status === s ? "bg-ink text-white border-ink" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === s ? "bg-white" : statusMeta[s].dot}`} />
            {statusMeta[s].label} <span className="opacity-70">{countByStatus[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      <form className="flex gap-2" action="/cases">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="ابحث برقم القضية، الموضوع، العميل، أو الخصم"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm rounded-lg px-4">
          بحث
        </button>
        {q && (
          <Link href={buildHref(status)} className="text-sm text-gray-500 hover:text-ink self-center px-2">
            مسح
          </Link>
        )}
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">القضية</th>
              <th className="text-right px-5 py-3 font-medium">العميل</th>
              <th className="text-right px-5 py-3 font-medium">المحامي</th>
              <th className="text-right px-5 py-3 font-medium">الحالة</th>
              <th className="text-right px-5 py-3 font-medium">الجلسة القادمة</th>
              <th className="text-right px-5 py-3 font-medium">الجلسات</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const next = c.hearings[0]?.date;
              const daysLeft = next ? Math.ceil((next.getTime() - now.getTime()) / 86400000) : null;
              return (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
                  <td className="px-5 py-3">
                    <Link href={`/cases/${c.id}`} className="block">
                      <span className="font-medium text-ink">{c.title}</span>
                      <span className="block text-xs text-gray-400 mt-0.5 font-mono" dir="ltr">
                        {c.caseNumber}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{c.client.name}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {c.lawyer ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-[11px] font-semibold flex items-center justify-center">
                          {c.lawyer.name.trim().slice(0, 1)}
                        </span>
                        {c.lawyer.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">غير محدد</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${statusMeta[c.status].chip}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta[c.status].dot}`} />
                      {statusMeta[c.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {next ? (
                      <div>
                        <p className="text-ink">{next.toLocaleDateString("ar-SA", { day: "numeric", month: "short" })}</p>
                        <p className={`text-xs ${daysLeft !== null && daysLeft <= 3 ? "text-red-600" : "text-gray-400"}`}>
                          {daysLeft === 0 ? "اليوم" : daysLeft === 1 ? "غداً" : `بعد ${daysLeft} يوم`}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500 tabular-nums">{c._count.hearings}</td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <p className="text-ink font-medium">{q || status ? "لا توجد قضايا تطابق البحث" : "لا توجد قضايا بعد"}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {q || status ? (
                      <Link href="/cases" className="text-primary-700 hover:underline">عرض كل القضايا</Link>
                    ) : (
                      <Link href="/cases/new" className="text-primary-700 hover:underline">أضف أول قضية</Link>
                    )}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
