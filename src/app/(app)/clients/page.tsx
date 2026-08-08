import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: { _count: { select: { cases: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">العملاء</h1>
          <p className="text-gray-500 text-sm mt-1">قائمة عملاء المكتب</p>
        </div>
        <Link
          href="/clients/new"
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          + عميل جديد
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-primary-300 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 font-medium">
                {c.type === "COMPANY" ? "شركة" : "فرد"}
              </span>
              <span className="text-xs text-gray-400">{c._count.cases} قضية</span>
            </div>
            <p className="font-bold text-ink">{c.name}</p>
            <p className="text-sm text-gray-500 mt-1">{c.phone ?? "—"}</p>
          </Link>
        ))}
        {clients.length === 0 && (
          <p className="text-gray-400 text-sm">لا يوجد عملاء مسجّلون بعد.</p>
        )}
      </div>
    </div>
  );
}
