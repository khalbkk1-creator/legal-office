import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postJournalEntry, assertDateNotLocked } from "@/lib/accounting";

const HEARING_REMINDER_DAYS = 3;
const APPEAL_DEADLINE_REMINDER_DAYS = 7;
const OVERDUE_INVOICE_DAYS = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    recurringPosted: 0,
    hearingAlerts: 0,
    appealAlerts: 0,
    overdueAlerts: 0,
    errors: [] as string[],
  };

  try {
    const dueTemplates = await prisma.recurringEntry.findMany({
      where: {
        isActive: true,
        dayOfMonth: { lte: now.getDate() },
        OR: [
          { lastPostedYear: null },
          {
            NOT: { lastPostedYear: now.getFullYear(), lastPostedMonth: now.getMonth() + 1 },
          },
        ],
      },
      include: { lines: true },
    });

    for (const template of dueTemplates) {
      try {
        const postDate = new Date(now.getFullYear(), now.getMonth(), Math.min(template.dayOfMonth, 28));
        await assertDateNotLocked(postDate);

        await postJournalEntry({
          description: template.description,
          sourceType: "RECURRING",
          sourceId: template.id,
          date: postDate,
          lines: template.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })),
        });

        await prisma.recurringEntry.update({
          where: { id: template.id },
          data: { lastPostedYear: now.getFullYear(), lastPostedMonth: now.getMonth() + 1 },
        });
        results.recurringPosted++;
      } catch (e: any) {
        results.errors.push(`قيد متكرر "${template.description}": ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`فحص القيود المتكررة: ${e.message}`);
  }

  try {
    const reminderCutoff = new Date(now.getTime() + HEARING_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    const upcomingHearings = await prisma.hearing.findMany({
      where: { date: { gte: now, lte: reminderCutoff } },
      include: { case: true },
    });

    for (const h of upcomingHearings) {
      try {
        await prisma.alert.create({
          data: {
            type: "HEARING_REMINDER",
            title: `جلسة قادمة — ${h.case.title}`,
            description: `جلسة القضية ${h.case.caseNumber} بتاريخ ${h.date.toLocaleDateString("ar-SA")}${h.court ? ` بمحكمة ${h.court}` : ""}`,
            entityType: "Hearing",
            entityId: h.id,
            dueDate: h.date,
          },
        });
        results.hearingAlerts++;
      } catch {
        // تجاهل التكرار
      }
    }
  } catch (e: any) {
    results.errors.push(`تذكيرات الجلسات: ${e.message}`);
  }

  try {
    const appealCutoff = new Date(now.getTime() + APPEAL_DEADLINE_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    const casesWithDeadline = await prisma.case.findMany({
      where: { appealDeadline: { gte: now, lte: appealCutoff }, status: { not: "CLOSED" } },
    });

    for (const c of casesWithDeadline) {
      try {
        await prisma.alert.create({
          data: {
            type: "APPEAL_DEADLINE",
            title: `موعد استئناف يقترب — ${c.title}`,
            description: `آخر موعد للاستئناف بالقضية ${c.caseNumber} هو ${c.appealDeadline!.toLocaleDateString("ar-SA")}`,
            entityType: "Case",
            entityId: c.id,
            dueDate: c.appealDeadline,
          },
        });
        results.appealAlerts++;
      } catch {
        // تكرار
      }
    }
  } catch (e: any) {
    results.errors.push(`تذكيرات الاستئناف: ${e.message}`);
  }

  try {
    const overdueCutoff = new Date(now.getTime() - OVERDUE_INVOICE_DAYS * 24 * 60 * 60 * 1000);
    const overdueSales = await prisma.sale.findMany({
      where: { paymentStatus: { not: "PAID" }, saleDate: { lte: overdueCutoff } },
      include: { client: true },
    });

    for (const s of overdueSales) {
      try {
        await prisma.alert.create({
          data: {
            type: "OVERDUE_INVOICE",
            title: `فاتورة متأخرة — ${s.invoiceNumber}`,
            description: `فاتورة العميل ${s.client.name} بمبلغ ${(s.totalAmount - s.paidAmount).toLocaleString()} ر.س متأخرة أكثر من ${OVERDUE_INVOICE_DAYS} يوم`,
            entityType: "Sale",
            entityId: s.id,
            dueDate: s.saleDate,
          },
        });
        results.overdueAlerts++;
      } catch {
        // تكرار
      }
    }
  } catch (e: any) {
    results.errors.push(`فحص الفواتير المتأخرة: ${e.message}`);
  }

  return NextResponse.json({ ok: true, ranAt: now.toISOString(), ...results });
}
