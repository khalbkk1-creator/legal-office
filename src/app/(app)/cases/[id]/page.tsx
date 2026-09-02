import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AddHearingForm from "./AddHearingForm";
import AddUpdateForm from "./AddUpdateForm";
import CaseDocuments from "./CaseDocuments";
import CaseActions from "./CaseActions";
import HearingItem from "./HearingItem";
import DocumentGenerator from "./DocumentGenerator";
import Timeline, { TimelineEvent } from "@/components/Timeline";
import CaseMessages from "./CaseMessages";
import TimeEntries from "./TimeEntries";

const appealCategoryLabels: Record<string, string> = {
  REGULAR: "عادية (30 يوم)",
  EXECUTION: "تنفيذ (10 أيام)",
  URGENT: "مستعجلة (10 أيام)",
};

const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  UNDER_REVIEW: { label: "تحت الدراسة", color: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  UNDER_APPROVAL: { label: "تحت الاعتماد", color: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  ACTIVE: { label: "جارية", color: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
  ON_HOLD: { label: "معلقة", color: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  CLOSED: { label: "مغلقة", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role ?? "";
  const item = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      lawyer: true,
      hearings: { orderBy: { date: "asc" } },
      updates: { include: { author: true }, orderBy: { createdAt: "desc" } },
      documents: true,
      sales: true,
      quotations: true,
      messages: { orderBy: { createdAt: "asc" } },
      timeEntries: { include: { lawyer: true }, orderBy: { entryDate: "desc" } },
    },
  });
  if (!item) notFound();
  const settings = await prisma.officeSettings.findFirst();

  const events: TimelineEvent[] = [];
  events.push({ date: item.createdAt, icon: "📁", title: "فُتحت القضية", description: item.caseNumber, color: "bg-gray-100 text-gray-600" });
  for (const h of item.hearings) {
    events.push({
      date: h.date,
      icon: "📅",
      title: h.roundNumber ? `الجلسة رقم ${h.roundNumber}` : "جلسة",
      description: h.court || undefined,
      color: "bg-blue-50 text-blue-700",
    });
    if (h.reportUrl) {
      events.push({
        date: h.date,
        icon: "📄",
        title: "تقرير الجلسة",
        description: h.reportName || undefined,
        color: "bg-purple-50 text-purple-700",
      });
    }
  }
  for (const d of item.documents) {
    events.push({
      date: d.createdAt,
      icon: "📎",
      title: `مرفق: ${d.fileName}`,
      color: "bg-amber-50 text-amber-700",
    });
  }
  for (const u of item.updates) {
    events.push({
      date: u.createdAt,
      icon: "📝",
      title: "ملاحظة متابعة",
      description: `${u.note} — ${u.author.name}`,
      color: "bg-gray-100 text-gray-600",
    });
  }
  for (const m of item.messages) {
    events.push({
      date: m.createdAt,
      icon: m.fromClient ? "💬" : "↩️",
      title: m.fromClient ? "رسالة من العميل" : "رد المحامي",
      description: m.message,
      color: m.fromClient ? "bg-blue-50 text-blue-700" : "bg-primary-50 text-primary-700",
    });
  }
  for (const q of item.quotations) {
    events.push({
      date: q.createdAt,
      icon: "📝",
      title: `عرض سعر ${q.quoteNumber} — ${q.totalAmount.toLocaleString()} ر.س`,
      href: "/quotes",
      color: "bg-purple-50 text-purple-700",
    });
  }
  for (const s of item.sales) {
    events.push({
      date: s.saleDate,
      icon: "💰",
      title: `فاتورة ${s.invoiceNumber} — ${s.totalAmount.toLocaleString()} ر.س`,
      href: "/sales",
      color: "bg-primary-50 text-primary-700",
    });
  }

  const now = new Date();
  const upcomingHearings = item.hearings.filter((h) => h.date >= now);
  const nextHearing = upcomingHearings[0];
  const appeal = item.appealDeadline ? appealBadge(item.appealDeadline) : null;
  const totalBilled = item.sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalOutstanding = item.sales.reduce((s, x) => s + (x.totalAmount - x.paidAmount), 0);
  const status = statusLabels[item.status];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Link href="/cases" className="text-xs text-gray-500 hover:text-ink">‹ القضايا</Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h1 className="text-2xl font-bold text-ink">{item.title}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            <span className="font-mono" dir="ltr">{item.caseNumber}</span> · {item.caseType}
          </p>
        </div>
        <Link
          href={`/cases/${item.id}/edit`}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2.5 transition shrink-0"
        >
          تعديل القضية
        </Link>
      </div>

      {appeal && appeal.urgent && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-800">موعد الاستئناف يقترب</p>
            <p className="text-xs text-red-700 mt-0.5">
              آخر موعد {new Date(item.appealDeadline!).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })} — {appeal.label}
            </p>
          </div>
          <span className="text-2xl font-bold text-red-700 tabular-nums">{appeal.days < 0 ? "!" : appeal.days}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="الجلسة القادمة" value={nextHearing ? nextHearing.date.toLocaleDateString("ar-SA", { day: "numeric", month: "short" }) : "—"} />
            <Stat label="إجمالي الفواتير" value={`${totalBilled.toLocaleString()} ر.س`} />
            <Stat label="المستحق" value={`${totalOutstanding.toLocaleString()} ر.س`} tone={totalOutstanding > 0 ? "text-red-600" : "text-ink"} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink">الجلسات</h2>
              <span className="text-xs text-gray-500">{upcomingHearings.length} قادمة · {item.hearings.length} إجمالي</span>
            </div>
            <div className="space-y-3 mb-5">
              {item.hearings.length === 0 && <p className="text-sm text-gray-400">لا توجد جلسات مسجّلة لهذه القضية.</p>}
              {item.hearings.map((h) => (
                <HearingItem
                  key={h.id}
                  caseId={item.id}
                  defaultCourt={item.court}
                  hearing={{
                    id: h.id,
                    date: h.date.toISOString(),
                    court: h.court,
                    roundNumber: h.roundNumber,
                    notes: h.notes,
                    outcome: h.outcome,
                    isFinalRuling: h.isFinalRuling,
                    reportUrl: h.reportUrl,
                    reportName: h.reportName,
                  }}
                />
              ))}
            </div>
            <AddHearingForm caseId={item.id} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-ink mb-4">سجل المتابعة</h2>
            <div className="space-y-3 mb-5">
              {item.updates.length === 0 && <p className="text-sm text-gray-400">لا توجد ملاحظات مسجّلة بعد.</p>}
              {item.updates.map((u) => (
                <div key={u.id} className="flex gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-800 text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {u.author.name.trim().slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{u.note}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {u.author.name} · {new Date(u.createdAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <AddUpdateForm caseId={item.id} />
          </div>

          <CaseDocuments caseId={item.id} />
          <DocumentGenerator caseId={item.id} />
          <CaseMessages
            caseId={item.id}
            messages={item.messages.map((m) => ({
              id: m.id,
              fromClient: m.fromClient,
              message: m.message,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
          <TimeEntries
            caseId={item.id}
            defaultRate={settings?.defaultHourlyRate ?? 0}
            entries={item.timeEntries.map((e) => ({
              id: e.id,
              description: e.description,
              minutes: e.minutes,
              hourlyRate: e.hourlyRate,
              billed: e.billed,
              entryDate: e.entryDate.toISOString(),
              lawyer: { name: e.lawyer.name },
            }))}
          />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-ink mb-4">الخط الزمني للقضية</h2>
            <Timeline events={events} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">الإجراءات</h2>
            <CaseActions caseId={item.id} status={item.status} userRole={userRole} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">العميل</p>
              <Link href={`/clients/${item.client.id}`} className="text-sm font-semibold text-ink hover:text-primary-700">
                {item.client.name}
              </Link>
              {item.client.phone && (
                <p className="text-xs text-gray-500 mt-0.5" dir="ltr">
                  <span className="block text-right">{item.client.phone}</span>
                </p>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 mb-1">المحامي المسؤول</p>
              <p className="text-sm font-medium text-ink">{item.lawyer?.name ?? <span className="text-gray-400 font-normal">غير معيّن</span>}</p>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <Row label="المحكمة" value={item.court ?? "—"} />
              <Row label="الطرف الآخر" value={item.opposingParty ?? "—"} />
              <Row label="قيمة المطالبة" value={item.claimValue ? `${item.claimValue.toLocaleString()} ر.س` : "—"} />
              <Row label="تصنيف الاستئناف" value={appealCategoryLabels[item.appealCategory]} />
              {item.appealDeadline && appeal && (
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-gray-400 shrink-0">آخر موعد للاستئناف</span>
                  <span className={`text-left ${appeal.className}`}>
                    {new Date(item.appealDeadline).toLocaleDateString("ar-SA")}
                    <span className="block text-xs">{appeal.label}</span>
                  </span>
                </div>
              )}
              <Row label="فُتحت في" value={new Date(item.createdAt).toLocaleDateString("ar-SA")} />
            </div>
          </div>

          {item.description && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-ink mb-2">وصف القضية</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function appealBadge(deadline: Date | string) {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { days, urgent: true, label: "انتهى الموعد", className: "font-medium text-red-600" };
  if (days === 0) return { days, urgent: true, label: "اليوم آخر موعد", className: "font-medium text-red-600" };
  if (days <= 7) return { days, urgent: true, label: `باقي ${days} يوم`, className: "font-medium text-red-600" };
  if (days <= 14) return { days, urgent: true, label: `باقي ${days} يوم`, className: "font-medium text-amber-600" };
  return { days, urgent: false, label: `باقي ${days} يوم`, className: "font-medium text-ink" };
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-3">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-ink font-medium text-left">{value}</span>
    </div>
  );
}
