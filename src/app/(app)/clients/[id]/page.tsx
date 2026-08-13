import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PortalLinkGenerator from "./PortalLinkGenerator";
import Timeline, { TimelineEvent } from "@/components/Timeline";

const requestTypeLabels: Record<string, string> = { CASE: "قضية", CONSULTATION: "استشارة" };
const paymentLabels: Record<string, string> = { PAID: "مدفوعة", UNPAID: "غير مدفوعة", PARTIAL: "مدفوعة جزئياً" };
const quoteStatusLabels: Record<string, string> = { PENDING: "بانتظار الرد", ACCEPTED: "مقبول", REJECTED: "مرفوض", EXPIRED: "منتهي" };

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
    include: {
      cases: { include: { lawyer: true }, orderBy: { createdAt: "desc" } },
      serviceRequests: true,
      quotations: true,
      sales: true,
    },
  });

  if (!client) notFound();

  const events: TimelineEvent[] = [];

  events.push({ date: client.createdAt, icon: "👤", title: "انضم كعميل", color: "bg-gray-100 text-gray-600" });

  for (const r of client.serviceRequests) {
    events.push({
      date: r.createdAt,
      icon: "📋",
      title: `طلب خدمة جديد — ${requestTypeLabels[r.requestType]}`,
      description: r.notes || undefined,
      href: `/service-requests/${r.id}`,
      color: "bg-blue-50 text-blue-700",
    });
  }

  for (const q of client.quotations) {
    events.push({
      date: q.createdAt,
      icon: "📝",
      title: `عرض سعر ${q.quoteNumber} — ${q.totalAmount.toLocaleString()} ر.س`,
      description: `الحالة: ${quoteStatusLabels[q.status]}`,
      href: `/quotes`,
      color: "bg-purple-50 text-purple-700",
    });
  }

  for (const s of client.sales) {
    events.push({
      date: s.saleDate,
      icon: "💰",
      title: `فاتورة ${s.invoiceNumber} — ${s.totalAmount.toLocaleString()} ر.س`,
      description: `الحالة: ${paymentLabels[s.paymentStatus]}`,
      href: `/sales`,
      color: "bg-primary-50 text-primary-700",
    });
  }

  for (const c of client.cases) {
    events.push({
      date: c.createdAt,
      icon: "📁",
      title: `قضية جديدة — ${c.title}`,
      description: c.caseNumber,
      href: `/cases/${c.id}`,
      color: "bg-amber-50 text-amber-700",
    });
  }

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

      <PortalLinkGenerator clientId={client.id} existingToken={client.accessToken} clientPhone={client.phone} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-4">الخط الزمني</h2>
        <Timeline events={events} />
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
