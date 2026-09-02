import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RegisterLinkCopy from "./RegisterLinkCopy";

export const dynamic = "force-dynamic";

const typeMeta: Record<string, { label: string; chip: string }> = {
  INDIVIDUAL: { label: "فرد", chip: "bg-blue-50 text-blue-700" },
  COMPANY: { label: "شركة", chip: "bg-primary-50 text-primary-700" },
  GOVERNMENT: { label: "جهة حكومية", chip: "bg-purple-50 text-purple-700" },
};

export default async function ClientsPage({ searchParams }: { searchParams?: { type?: string; q?: string } }) {
  const type = searchParams?.type && typeMeta[searchParams.type] ? searchParams.type : "";
  const q = (searchParams?.q ?? "").trim();

  const [clients, counts] = await Promise.all([
    prisma.client.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { email: { contains: q, mode: "insensitive" } },
                { idNumber: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { cases: true } },
        cases: { where: { status: { not: "CLOSED" } }, select: { id: true } },
        sales: { where: { paymentStatus: { not: "PAID" } }, select: { totalAmount: true, paidAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.groupBy({ by: ["type"], _count: true }),
  ]);

  const countByType: Record<string, number> = {};
  for (const c of counts) countByType[c.type] = c._count;
  const total = counts.reduce((s, c) => s + c._count, 0);

  const buildHref = (nextType: string) => {
    const p = new URLSearchParams();
    if (nextType) p.set("type", nextType);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/clients?${s}` : "/clients";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">العملاء</h1>
          <p className="text-gray-500 text-sm mt-1">{total} عميل مسجّل</p>
        </div>
        <Link href="/clients/new" className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition shrink-0">
          + عميل جديد
        </Link>
      </div>

      <RegisterLinkCopy />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref("")}
          className={`px-3 py-1.5 rounded-full text-sm border transition ${
            !type ? "bg-ink text-white border-ink" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
          }`}
        >
          الكل <span className="opacity-70">{total}</span>
        </Link>
        {Object.entries(typeMeta).map(([k, m]) => (
          <Link
            key={k}
            href={buildHref(k)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              type === k ? "bg-ink text-white border-ink" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
            }`}
          >
            {m.label} <span className="opacity-70">{countByType[k] ?? 0}</span>
          </Link>
        ))}
      </div>

      <form className="flex gap-2" action="/clients">
        {type && <input type="hidden" name="type" value={type} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="ابحث بالاسم، الجوال، البريد، أو رقم الهوية"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm rounded-lg px-4">
          بحث
        </button>
        {q && (
          <Link href={buildHref(type)} className="text-sm text-gray-500 hover:text-ink self-center px-2">
            مسح
          </Link>
        )}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => {
          const activeCases = c.cases.length;
          const outstanding = c.sales.reduce((s, x) => s + (x.totalAmount - x.paidAmount), 0);
          const hasPortal = !!c.passwordHash || !!c.accessToken;
          return (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-primary-300 transition"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-800 font-bold text-lg flex items-center justify-center shrink-0">
                  {c.name.trim().slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink truncate">{c.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${typeMeta[c.type]?.chip ?? "bg-gray-100 text-gray-600"}`}>
                      {typeMeta[c.type]?.label ?? c.type}
                    </span>
                    {hasPortal && <span className="text-[11px] text-gray-400">بوابة مفعّلة</span>}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600 space-y-0.5">
                {c.phone && <p dir="ltr" className="text-right">{c.phone}</p>}
                {c.email && <p dir="ltr" className="text-right truncate">{c.email}</p>}
                {!c.phone && !c.email && <p className="text-gray-400">بدون بيانات تواصل</p>}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400">قضايا جارية</p>
                  <p className="text-ink font-semibold tabular-nums">
                    {activeCases} <span className="text-gray-400 font-normal">/ {c._count.cases}</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">مستحق</p>
                  <p className={`font-semibold tabular-nums ${outstanding > 0 ? "text-red-600" : "text-ink"}`}>
                    {outstanding.toLocaleString()} ر.س
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {clients.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
          <p className="text-ink font-medium">{q || type ? "لا يوجد عملاء يطابقون البحث" : "لا يوجد عملاء بعد"}</p>
          <p className="text-sm text-gray-500 mt-1">
            {q || type ? (
              <Link href="/clients" className="text-primary-700 hover:underline">عرض كل العملاء</Link>
            ) : (
              <Link href="/clients/new" className="text-primary-700 hover:underline">أضف أول عميل</Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
