import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

const statusLabels: Record<string, { label: string; color: string }> = {
  UNDER_REVIEW: { label: "تحت الدراسة", color: "bg-blue-50 text-blue-700" },
  UNDER_APPROVAL: { label: "تحت الاعتماد", color: "bg-purple-50 text-purple-700" },
  ACTIVE: { label: "جارية", color: "bg-primary-50 text-primary-700" },
  ON_HOLD: { label: "معلقة", color: "bg-amber-50 text-amber-700" },
  CLOSED: { label: "مغلقة", color: "bg-red-50 text-red-600" },
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { cases: { include: { lawyer: true }, orderBy: { createdAt: "desc" } } },
  });

  if (!client) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{client.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {client.type === "COMPANY" ? "شركة" : "فرد"} {client.idNumber ? `· ${client.idNumber}` : ""}
          </p>
        </div>
        <Link href="/clients" className="text-sm text-primary-700 hover:underline">
          ← رجوع للعملاء
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 grid grid-cols-2 gap-3">
        <Row label="الجوال" value={client.phone ?? "—"} />
        <Row label="البريد الإلكتروني" value={client.email ?? "—"} />
        <Row label="العنوان" value={client.address ?? "—"} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-4">قضايا العميل ({client.cases.length})</h2>
        <div className="space-y-3">
          {client.cases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-3 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-ink">{c.title}</p>
                <p className="text-xs text-gray-400">{c.caseNumber} · {c.lawyer?.name ?? "غير معيّن"}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[c.status].color}`}>
                {statusLabels[c.status].label}
              </span>
            </Link>
          ))}
          {client.cases.length === 0 && (
            <p className="text-sm text-gray-400">لا توجد قضايا لهذا العميل بعد.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}
