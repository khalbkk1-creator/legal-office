import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Notification = {
  id: string;
  icon: string;
  title: string;
  description?: string;
  href: string;
  urgency: "high" | "medium" | "low";
  date: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const notifications: Notification[] = [];
  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;

  const [
    newRequests,
    docsSubmitted,
    acceptedQuotesInRequests,
    pendingConsultations,
    upcomingHearings,
    appealCases,
    allUnpaidSales,
    staleQuotes,
    expiredQuotes,
    hearingsMissingReports,
    unassignedCases,
    allCaseMessages,
    draftJournalEntries,
    paymentRequestsAwaitingInvoice,
    paymentRequestsAwaitingClosure,
  ] = await Promise.all([
    prisma.serviceRequest.findMany({ where: { status: "NEW" }, include: { client: true } }),
    prisma.serviceRequest.findMany({ where: { status: "DOCS_SUBMITTED" }, include: { client: true } }),
    prisma.serviceRequest.findMany({
      where: { status: { not: "CONVERTED" }, quotation: { status: "ACCEPTED" } },
      include: { client: true, quotation: true },
    }),
    prisma.consultationRequest.findMany({ where: { status: "PENDING" } }),
    prisma.hearing.findMany({
      where: { date: { gte: new Date(), lte: new Date(now + 3 * DAY) } },
      include: { case: { include: { client: true } } },
    }),
    prisma.case.findMany({
      where: { appealDeadline: { not: null, lte: new Date(now + 7 * DAY) }, status: { not: "CLOSED" } },
      include: { client: true },
    }),
    prisma.sale.findMany({
      where: { paymentStatus: { not: "PAID" } },
      include: { client: true },
    }),
    prisma.quotation.findMany({
      where: { status: "PENDING", createdAt: { lte: new Date(now - 5 * DAY) } },
      include: { client: true },
    }),
    prisma.quotation.findMany({
      where: { status: "PENDING", validUntil: { not: null, lt: new Date() } },
      include: { client: true },
    }),
    prisma.hearing.findMany({
      where: { date: { lt: new Date() }, reportUrl: null },
      include: { case: true },
    }),
    prisma.case.findMany({
      where: { lawyerId: null, status: { not: "CLOSED" } },
      include: { client: true },
    }),
    prisma.caseMessage.findMany({
      orderBy: { createdAt: "desc" },
      include: { case: { include: { client: true } } },
    }),
    prisma.journalEntry.findMany({ where: { status: "DRAFT" }, orderBy: { createdAt: "asc" } }),
    prisma.paymentRequest.findMany({
      where: { status: "PAID", invoiceUrl: null },
      include: { requestedBy: true },
      orderBy: { paidAt: "asc" },
    }),
    prisma.paymentRequest.findMany({
      where: { status: "PAID", invoiceUrl: { not: null } },
      orderBy: { invoiceUploadedAt: "asc" },
    }),
  ]);

  for (const r of newRequests) {
    notifications.push({
      id: `req-new-${r.id}`,
      icon: "📋",
      title: `طلب خدمة جديد من ${r.client.name}`,
      description: r.requestType === "CASE" ? "طلب قضية" : "طلب استشارة",
      href: `/service-requests/${r.id}`,
      urgency: "high",
      date: r.createdAt.toISOString(),
    });
  }

  for (const r of docsSubmitted) {
    notifications.push({
      id: `req-docs-${r.id}`,
      icon: "📎",
      title: `${r.client.name} رفع المستندات المطلوبة`,
      href: `/service-requests/${r.id}`,
      urgency: "medium",
      date: r.createdAt.toISOString(),
    });
  }

  for (const r of acceptedQuotesInRequests) {
    notifications.push({
      id: `req-accepted-${r.id}`,
      icon: "✅",
      title: `${r.client.name} وافق على عرض السعر — جاهز للتحويل`,
      href: `/service-requests/${r.id}`,
      urgency: "high",
      date: (r.quotation?.createdAt ?? r.createdAt).toISOString(),
    });
  }

  for (const c of pendingConsultations) {
    notifications.push({
      id: `consult-${c.id}`,
      icon: "📩",
      title: `طلب استشارة جديد من ${c.name}`,
      description: new Date(c.requestedDate).toLocaleDateString("ar-SA"),
      href: `/consultations`,
      urgency: "medium",
      date: c.createdAt.toISOString(),
    });
  }

  for (const h of upcomingHearings) {
    const days = Math.ceil((h.date.getTime() - now) / DAY);
    notifications.push({
      id: `hearing-${h.id}`,
      icon: "📅",
      title: `جلسة قريبة — ${h.case.title}`,
      description: days <= 0 ? "اليوم" : `بعد ${days} يوم`,
      href: `/cases/${h.caseId}`,
      urgency: days <= 1 ? "high" : "medium",
      date: h.date.toISOString(),
    });
  }

  for (const c of appealCases) {
    if (!c.appealDeadline) continue;
    const days = Math.ceil((c.appealDeadline.getTime() - now) / DAY);
    notifications.push({
      id: `appeal-${c.id}`,
      icon: "⚠️",
      title: `موعد استئناف قريب — ${c.title}`,
      description: days <= 0 ? "انتهى الموعد" : `باقي ${days} يوم`,
      href: `/cases/${c.id}`,
      urgency: days <= 3 ? "high" : "medium",
      date: c.appealDeadline.toISOString(),
    });
  }

  for (const s of allUnpaidSales) {
    const days = Math.floor((now - s.saleDate.getTime()) / DAY);
    const remaining = s.totalAmount - s.paidAmount;
    notifications.push({
      id: `sale-${s.id}`,
      icon: "💸",
      title: `فاتورة غير محصّلة — ${s.client.name}`,
      description: `${s.invoiceNumber} · ${remaining.toLocaleString()} ر.س${days > 0 ? ` · منذ ${days} يوم` : ""}`,
      href: `/sales`,
      urgency: days >= 30 ? "high" : days >= 7 ? "medium" : "low",
      date: s.saleDate.toISOString(),
    });
  }

  for (const q of staleQuotes) {
    notifications.push({
      id: `quote-stale-${q.id}`,
      icon: "📝",
      title: `عرض سعر بدون رد — ${q.client.name}`,
      description: q.quoteNumber,
      href: `/quotes`,
      urgency: "low",
      date: q.createdAt.toISOString(),
    });
  }

  for (const q of expiredQuotes) {
    notifications.push({
      id: `quote-expired-${q.id}`,
      icon: "⏰",
      title: `عرض سعر منتهي الصلاحية — ${q.client.name}`,
      description: q.quoteNumber,
      href: `/quotes`,
      urgency: "medium",
      date: (q.validUntil ?? q.createdAt).toISOString(),
    });
  }

  for (const h of hearingsMissingReports) {
    const days = Math.floor((now - h.date.getTime()) / DAY);
    notifications.push({
      id: `hearing-report-${h.id}`,
      icon: "📄",
      title: `جلسة بدون تقرير — ${h.case.title}`,
      description: `منذ ${days} يوم`,
      href: `/cases/${h.caseId}`,
      urgency: days >= 7 ? "high" : "medium",
      date: h.date.toISOString(),
    });
  }

  for (const c of unassignedCases) {
    notifications.push({
      id: `case-unassigned-${c.id}`,
      icon: "👤",
      title: `قضية بدون محامي — ${c.title}`,
      description: `${c.client.name} · ${c.caseNumber}`,
      href: `/cases/${c.id}`,
      urgency: "medium",
      date: c.createdAt.toISOString(),
    });
  }

  const latestMessageByCase = new Map<string, (typeof allCaseMessages)[number]>();
  for (const m of allCaseMessages) {
    if (!latestMessageByCase.has(m.caseId)) latestMessageByCase.set(m.caseId, m);
  }
  for (const m of latestMessageByCase.values()) {
    if (m.fromClient) {
      notifications.push({
        id: `msg-${m.id}`,
        icon: "💬",
        title: `رسالة من ${m.case.client.name} بانتظار الرد`,
        description: m.message.slice(0, 60),
        href: `/cases/${m.caseId}`,
        urgency: "high",
        date: m.createdAt.toISOString(),
      });
    }
  }

  if (draftJournalEntries.length > 0) {
    const oldest = draftJournalEntries[0];
    notifications.push({
      id: "drafts-pending",
      icon: "📝",
      title: `${draftJournalEntries.length} قيد مسودة بانتظار الاعتماد`,
      description: `أقدم مسودة: ${oldest.description}`,
      href: "/accounting?tab=journal",
      urgency: draftJournalEntries.length >= 5 ? "high" : "medium",
      date: oldest.createdAt.toISOString(),
    });
  }

  if (paymentRequestsAwaitingInvoice.length > 0) {
    for (const r of paymentRequestsAwaitingInvoice.slice(0, 5)) {
      notifications.push({
        id: `pr-invoice-${r.id}`,
        icon: "🧾",
        title: `مطلوب إرفاق فاتورة المورد — ${r.requestNumber}`,
        description: `بانتظار ${r.requestedBy.name} لإرفاق فاتورة المورد لسلفة بمبلغ ${r.amount.toLocaleString()} ر.س`,
        href: "/payment-requests",
        urgency: "medium",
        date: (r.paidAt ?? r.createdAt).toISOString(),
      });
    }
  }

  if (paymentRequestsAwaitingClosure.length > 0) {
    notifications.push({
      id: "pr-closure-pending",
      icon: "✅",
      title: `${paymentRequestsAwaitingClosure.length} طلب صرف بانتظار إقفال الفاتورة`,
      description: "فاتورة المورد مرفقة، بانتظار اعتماد الإقفال من المالية",
      href: "/payment-requests",
      urgency: "high",
      date: paymentRequestsAwaitingClosure[0].createdAt.toISOString(),
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  notifications.sort((a, b) => order[a.urgency] - order[b.urgency] || new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(notifications);
}
