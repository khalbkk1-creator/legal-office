import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PortalLinkGenerator from "./PortalLinkGenerator";
import PortalSecurityPanel from "./PortalSecurityPanel";
import Timeline, { TimelineEvent } from "@/components/Timeline";

export const dynamic = "force-dynamic";

const requestTypeLabels: Record<string, string> = { CASE: "قضية", CONSULTATION: "استشارة" };
const paymentMeta: Record<string, { label: string; chip: string }> = {
  PAID: { label: "مدفوعة", chip: "bg-primary-50 text-primary-700" },
  UNPAID: { label: "غير مدفوعة", chip: "bg-red-50 text-red-600" },
  PARTIAL: { label: "مدفوعة جزئياً", chip: "bg-amber-50 text-amber-700" },
};
const quoteMeta: Record<string, { label: string; chip: string }> = {
  PENDING: { label: "بانتظار الرد", chip: "bg-amber-50 text-amber-700" },
  ACCEPTED: { label: "مقبول", chip: "bg-primary-50 text-primary-700" },
  REJECTED: { label: "مرفوض", chip: "bg-red-50 text-red-600" },
  EXPIRED: { label: "منتهي", chip: "bg-gray-100 text-gray-600" },
};
const caseMeta: Record<string, { label: string; chip: string; dot: string }> = {
  UNDER_REVIEW: { label: "تحت الدراسة", chip: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  UNDER_APPROVAL: { label: "تحت الاعتماد", chip: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  ACTIVE: { label: "جارية", chip: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
  ON_HOLD: { label: "معلقة", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  CLOSED: { label: "مغلقة", chip: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};
const typeMeta: Record<string, string> = { INDIVIDUAL: "فرد", COMPANY: "شركة", GOVERNMENT: "جهة حكومية" };
const srMeta: Record<string, string> = { NEW: "جديد", DOCS_REQUESTED: "بانتظار مستندات", DOCS_SUBMITTED: "المستندات مرفوعة", QUOTE_SENT: "أُرسل عرض سعر", ACCEPTED: "وافق على العرض", CONVERTED: "تم التحويل", REJECTED: "مرفوض", CANCELLED: "ملغي" };

type Tab = "overview" | "cases" | "finance" | "timeline" | "portal";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "نظرة عامة" },
  { key: "cases", label: "القضايا" },
  { key: "finance", label: "المالية" },
  { key: "timeline", label: "الخط الزمني" },
  { key: "portal", label: "بوابة العميل" },
];

export default async function ClientDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { tab?: string } }) {
  const tab: Tab = (TABS.some((t) => t.key === searchParams?.tab) ? searchParams!.tab : "overview") as Tab;

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      cases: { include: { lawyer: true, _count: { select: { hearings: true } }, hearings: { where: { date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 1, select: { date: true } } }, orderBy: { createdAt: "desc" } },
      serviceRequests: { orderBy: { createdAt: "desc" } },
      quotations: { orderBy: { createdAt: "desc" } },
      sales: { orderBy: { saleDate: "desc" } },
      portalAccessLogs: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!client) notFound();

  const now = new Date();
  const activeCases = client.cases.filter((c) => c.status !== "CLOSED");
  const totalBilled = client.sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalPaid = client.sales.reduce((s, x) => s + x.paidAmount, 0);
  const outstanding = totalBilled - totalPaid;
  const pendingQuotes = client.quotations.filter((q) => q.status === "PENDING");
  const overdue = client.sales.filter((s) => s.paymentStatus !== "PAID" && (now.getTime() - new Date(s.saleDate).getTime()) / 86400000 > 30);
  const hasPortal = !!client.passwordHash || !!client.accessToken;
  const lastActivity = [
    ...client.cases.map((c) => c.createdAt),
    ...client.sales.map((s) => s.saleDate),
    ...client.quotations.map((q) => q.createdAt),
    ...client.serviceRequests.map((r) => r.createdAt),
  ].sort((a, b) => b.getTime() - a.getTime())[0];

  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 } as Record<string, number>;
  for (const s of client.sales) {
    if (s.paymentStatus === "PAID") continue;
    const days = Math.floor((now.getTime() - new Date(s.saleDate).getTime()) / 86400000);
    const rem = s.totalAmount - s.paidAmount;
    if (days <= 30) buckets["0-30"] += rem;
    else if (days <= 60) buckets["31-60"] += rem;
    else if (days <= 90) buckets["61-90"] += rem;
    else buckets["90+"] += rem;
  }

  const events: TimelineEvent[] = [];
  events.push({ date: client.createdAt, icon: "👤", title: "انضم كعميل", color: "bg-gray-100 text-gray-600" });
  for (const r of client.serviceRequests) {
    events.push({ date: r.createdAt, icon: "📋", title: `طلب خدمة — ${requestTypeLabels[r.requestType]}`, description: r.notes || undefined, href: `/service-requests/${r.id}`, color: "bg-blue-50 text-blue-700" });
  }
  for (const q of client.quotations) {
    events.push({ date: q.createdAt, icon: "📝", title: `عرض سعر ${q.quoteNumber} — ${q.totalAmount.toLocaleString()} ر.س`, description: `الحالة: ${quoteMeta[q.status]?.label ?? q.status}`, href: `/quotes`, color: "bg-purple-50 text-purple-700" });
  }
  for (const s of client.sales) {
    events.push({ date: s.saleDate, icon: "💰", title: `فاتورة ${s.invoiceNumber} — ${s.totalAmount.toLocaleString()} ر.س`, description: `الحالة: ${paymentMeta[s.paymentStatus]?.label ?? s.paymentStatus}`, href: `/print/sales/${s.id}`, color: "bg-primary-50 text-primary-700" });
  }
  for (const c of client.cases) {
    events.push({ date: c.createdAt, icon: "📁", title: `قضية — ${c.title}`, description: c.caseNumber, href: `/cases/${c.id}`, color: "bg-amber-50 text-amber-700" });
  }

  const tabHref = (t: Tab) => (t === "overview" ? `/clients/${client.id}` : `/clients/${client.id}?tab=${t}`);

  const smart = [
    { key: "cases" as Tab, label: "القضايا", value: `${activeCases.length}`, sub: `من ${client.cases.length} إجمالي`, tone: "text-ink" },
    { key: "finance" as Tab, label: "إجمالي الفواتير", value: totalBilled.toLocaleString(), sub: "ر.س", tone: "text-ink" },
    { key: "finance" as Tab, label: "المستحق", value: outstanding.toLocaleString(), sub: overdue.length ? `${overdue.length} متأخرة` : "ر.س", tone: outstanding > 0 ? "text-red-600" : "text-primary-700" },
    { key: "finance" as Tab, label: "عروض الأسعار", value: `${pendingQuotes.length}`, sub: `بانتظار الرد من ${client.quotations.length}`, tone: "text-ink" },
    { key: "timeline" as Tab, label: "طلبات الخدمة", value: `${client.serviceRequests.length}`, sub: client.serviceRequests.filter((r) => r.status === "NEW").length ? `${client.serviceRequests.filter((r) => r.status === "NEW").length} جديد` : "—", tone: "text-ink" },
  ];

  return (
    <div className="-mt-4 md:-mt-8 -mx-4 md:-mx-8">
      {/* رأس السجل */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 pt-5">
        <Link href="/clients" className="text-xs text-gray-500 hover:text-ink">‹ العملاء</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-primary-900 text-white text-2xl font-bold flex items-center justify-center shrink-0">
              {client.name.trim().slice(0, 1)}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-ink truncate">{client.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">{typeMeta[client.type] ?? client.type}</span>
                {client.idNumber && <span className="font-mono text-gray-500" dir="ltr">{client.idNumber}</span>}
                {hasPortal ? <span className="text-primary-700">● بوابة مفعّلة</span> : <span className="text-gray-400">○ بدون بوابة</span>}
                {lastActivity && <span className="text-gray-400">· آخر نشاط {lastActivity.toLocaleDateString("ar-SA")}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/print/statement/client/${client.id}`} target="_blank" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 transition">
              كشف حساب
            </Link>
            <Link href={`/sales/new?clientId=${client.id}`} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 transition">
              + فاتورة
            </Link>
            <Link href={`/cases/new?clientId=${client.id}`} className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2 transition">
              + قضية
            </Link>
          </div>
        </div>

        {/* الأزرار الذكية */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
          {smart.map((s, i) => (
            <Link key={i} href={tabHref(s.key)} className="rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 px-4 py-3 transition">
              <p className={`text-xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
            </Link>
          ))}
        </div>

        {/* التبويبات */}
        <div className="flex items-center gap-1 mt-4 -mb-px overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
                tab === t.key ? "border-primary-700 text-primary-700 font-medium" : "border-transparent text-gray-500 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            <div className="space-y-4">
              <Panel title="بيانات التواصل">
                <Field label="الجوال" value={client.phone} ltr />
                <Field label="البريد الإلكتروني" value={client.email} ltr />
                <Field label="العنوان" value={client.address} />
                <Field label="رقم الهوية / السجل" value={client.idNumber} ltr />
                <Field label="عميل منذ" value={client.createdAt.toLocaleDateString("ar-SA")} />
              </Panel>
              {client.notes && (
                <Panel title="ملاحظات">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
                </Panel>
              )}
              <Panel title="الذمة المالية">
                <Field label="إجمالي الفواتير" value={`${totalBilled.toLocaleString()} ر.س`} />
                <Field label="المسدد" value={`${totalPaid.toLocaleString()} ر.س`} />
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-500">المستحق</span>
                  <span className={`font-bold tabular-nums ${outstanding > 0 ? "text-red-600" : "text-primary-700"}`}>{outstanding.toLocaleString()} ر.س</span>
                </div>
              </Panel>
            </div>

            <div className="space-y-4">
              <Panel title="أحدث القضايا" action={<Link href={tabHref("cases")} className="text-xs text-primary-700 hover:underline">الكل ({client.cases.length})</Link>}>
                <CasesTable cases={client.cases.slice(0, 4)} now={now} compact />
              </Panel>
              <Panel title="أحدث الفواتير" action={<Link href={tabHref("finance")} className="text-xs text-primary-700 hover:underline">الكل ({client.sales.length})</Link>}>
                <SalesTable sales={client.sales.slice(0, 4)} />
              </Panel>
            </div>
          </div>
        )}

        {tab === "cases" && (
          <Panel title={`القضايا (${client.cases.length})`} action={<Link href={`/cases/new?clientId=${client.id}`} className="text-xs text-primary-700 hover:underline">+ قضية جديدة</Link>}>
            <CasesTable cases={client.cases} now={now} />
          </Panel>
        )}

        {tab === "finance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(buckets).map(([k, v]) => (
                <div key={k} className={`rounded-2xl border p-4 ${k === "90+" && v > 0 ? "bg-red-50 border-red-100" : "bg-white border-gray-200"}`}>
                  <p className="text-xs text-gray-500">{k === "90+" ? "أكثر من 90 يوم" : `${k} يوم`}</p>
                  <p className={`text-lg font-bold tabular-nums ${k === "90+" && v > 0 ? "text-red-600" : "text-ink"}`}>{v.toLocaleString()} ر.س</p>
                </div>
              ))}
            </div>
            <Panel title={`الفواتير (${client.sales.length})`} action={<span className="flex items-center gap-3"><Link href={`/print/statement/client/${client.id}`} target="_blank" className="text-xs text-primary-700 hover:underline">كشف حساب</Link><Link href={`/sales/new?clientId=${client.id}`} className="text-xs text-primary-700 hover:underline">+ فاتورة جديدة</Link></span>}>
              <SalesTable sales={client.sales} />
            </Panel>
            <Panel title={`عروض الأسعار (${client.quotations.length})`}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-right px-4 py-2 font-medium">الرقم</th>
                    <th className="text-right px-4 py-2 font-medium">التاريخ</th>
                    <th className="text-right px-4 py-2 font-medium">صالح حتى</th>
                    <th className="text-right px-4 py-2 font-medium">المبلغ</th>
                    <th className="text-right px-4 py-2 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {client.quotations.map((q) => (
                    <tr key={q.id} className="border-t border-gray-50">
                      <td className="px-4 py-2 font-mono text-xs" dir="ltr">{q.quoteNumber}</td>
                      <td className="px-4 py-2 text-gray-600">{q.createdAt.toLocaleDateString("ar-SA")}</td>
                      <td className="px-4 py-2 text-gray-600">{q.validUntil ? q.validUntil.toLocaleDateString("ar-SA") : "—"}</td>
                      <td className="px-4 py-2 tabular-nums">{q.totalAmount.toLocaleString()} ر.س</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-md text-xs font-medium ${quoteMeta[q.status]?.chip ?? ""}`}>{quoteMeta[q.status]?.label ?? q.status}</span></td>
                    </tr>
                  ))}
                  {client.quotations.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">لا توجد عروض أسعار.</td></tr>}
                </tbody>
              </table>
            </Panel>
          </div>
        )}

        {tab === "timeline" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <Panel title="الخط الزمني الكامل">
              <Timeline events={events} />
            </Panel>
            <Panel title={`طلبات الخدمة (${client.serviceRequests.length})`}>
              <div className="space-y-2">
                {client.serviceRequests.map((r) => (
                  <Link key={r.id} href={`/service-requests/${r.id}`} className="block rounded-lg border border-gray-100 px-3 py-2 hover:border-primary-300 transition">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink font-medium">{requestTypeLabels[r.requestType]}</span>
                      <span className="text-xs text-gray-500">{srMeta[r.status] ?? r.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{r.createdAt.toLocaleDateString("ar-SA")}</p>
                  </Link>
                ))}
                {client.serviceRequests.length === 0 && <p className="text-sm text-gray-400">لا توجد طلبات.</p>}
              </div>
            </Panel>
          </div>
        )}

        {tab === "portal" && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
            <div className="space-y-4">
              <Panel title="حالة البوابة">
                <Field label="الحساب" value={client.passwordHash ? "مفعّل بكلمة مرور" : "غير مفعّل"} />
                <Field label="البريد" value={client.email} ltr />
                <Field label="آخر دخول" value={client.lastPortalLoginAt ? client.lastPortalLoginAt.toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "لم يدخل بعد"} />
              </Panel>
              <PortalLinkGenerator clientId={client.id} existingToken={client.accessToken} clientPhone={client.phone} />
            </div>
            <PortalSecurityPanel
              clientId={client.id}
              portalDisabled={client.portalDisabled}
              lockedUntil={client.lockedUntil?.toISOString() ?? null}
              tokenExpiresAt={client.accessTokenExpiresAt?.toISOString() ?? null}
              hasToken={!!client.accessToken}
              logs={client.portalAccessLogs.map((l) => ({ id: l.id, event: l.event, ip: l.ip, userAgent: l.userAgent, path: l.path, detail: l.detail, createdAt: l.createdAt.toISOString() }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, value, ltr = false }: { label: string; value: string | null | undefined; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm py-1">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`text-ink font-medium text-left ${!value ? "text-gray-400 font-normal" : ""}`} dir={ltr && value ? "ltr" : undefined}>
        {value || "—"}
      </span>
    </div>
  );
}

function CasesTable({ cases, now, compact = false }: { cases: any[]; now: Date; compact?: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-gray-500 text-xs">
        <tr>
          <th className="text-right px-4 py-2 font-medium">القضية</th>
          {!compact && <th className="text-right px-4 py-2 font-medium">المحامي</th>}
          <th className="text-right px-4 py-2 font-medium">الحالة</th>
          <th className="text-right px-4 py-2 font-medium">الجلسة القادمة</th>
          {!compact && <th className="text-right px-4 py-2 font-medium">الجلسات</th>}
        </tr>
      </thead>
      <tbody>
        {cases.map((c) => {
          const next = c.hearings?.[0]?.date as Date | undefined;
          const days = next ? Math.ceil((next.getTime() - now.getTime()) / 86400000) : null;
          const m = caseMeta[c.status];
          return (
            <tr key={c.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
              <td className="px-4 py-2">
                <Link href={`/cases/${c.id}`} className="block">
                  <span className="text-ink font-medium">{c.title}</span>
                  <span className="block text-xs text-gray-400 font-mono" dir="ltr">{c.caseNumber}</span>
                </Link>
              </td>
              {!compact && <td className="px-4 py-2 text-gray-600">{c.lawyer?.name ?? <span className="text-gray-400">غير معيّن</span>}</td>}
              <td className="px-4 py-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${m.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
                </span>
              </td>
              <td className="px-4 py-2">
                {next ? (
                  <span className={days !== null && days <= 3 ? "text-red-600" : "text-gray-700"}>
                    {next.toLocaleDateString("ar-SA", { day: "numeric", month: "short" })}
                    <span className="text-xs text-gray-400"> · {days === 0 ? "اليوم" : days === 1 ? "غداً" : `بعد ${days} يوم`}</span>
                  </span>
                ) : <span className="text-gray-400">—</span>}
              </td>
              {!compact && <td className="px-4 py-2 text-gray-500 tabular-nums">{c._count?.hearings ?? 0}</td>}
            </tr>
          );
        })}
        {cases.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">لا توجد قضايا لهذا العميل.</td></tr>}
      </tbody>
    </table>
  );
}

function SalesTable({ sales }: { sales: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-gray-500 text-xs">
        <tr>
          <th className="text-right px-4 py-2 font-medium">الفاتورة</th>
          <th className="text-right px-4 py-2 font-medium">التاريخ</th>
          <th className="text-right px-4 py-2 font-medium">الإجمالي</th>
          <th className="text-right px-4 py-2 font-medium">المتبقي</th>
          <th className="text-right px-4 py-2 font-medium">الحالة</th>
          <th className="text-right px-4 py-2 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {sales.map((s) => {
          const rem = s.totalAmount - s.paidAmount;
          const m = paymentMeta[s.paymentStatus];
          return (
            <tr key={s.id} className="border-t border-gray-50">
              <td className="px-4 py-2">
                <span className="font-mono text-xs" dir="ltr">{s.invoiceNumber}</span>
                <span className="block text-xs text-gray-500 truncate max-w-[220px]">{s.description}</span>
              </td>
              <td className="px-4 py-2 text-gray-600">{new Date(s.saleDate).toLocaleDateString("ar-SA")}</td>
              <td className="px-4 py-2 tabular-nums">{s.totalAmount.toLocaleString()}</td>
              <td className={`px-4 py-2 tabular-nums ${rem > 0 ? "text-red-600 font-medium" : "text-gray-400"}`}>{rem > 0 ? rem.toLocaleString() : "—"}</td>
              <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-md text-xs font-medium ${m?.chip ?? ""}`}>{m?.label ?? s.paymentStatus}</span></td>
              <td className="px-4 py-2"><Link href={`/print/sales/${s.id}`} target="_blank" className="text-xs text-primary-700 hover:underline">طباعة</Link></td>
            </tr>
          );
        })}
        {sales.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">لا توجد فواتير.</td></tr>}
      </tbody>
    </table>
  );
}
