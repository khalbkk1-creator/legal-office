import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postJournalEntry, getSystemAccountId, assertDateNotLocked } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "PARTNER") {
    return NextResponse.json({ error: "إقفال الفاتورة متاح للشريك فقط" }, { status: 403 });
  }

  const request = await prisma.paymentRequest.findUnique({
    where: { id: params.id },
    include: { payee: true, category: true },
  });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  if (request.status !== "PAID") {
    return NextResponse.json({ error: "لازم يكون الطلب مصروف قبل الإقفال" }, { status: 400 });
  }
  if (!request.invoiceUrl) {
    return NextResponse.json({ error: "لازم يرفق مقدّم الطلب فاتورة المورد قبل الإقفال" }, { status: 400 });
  }

  try {
    await assertDateNotLocked(new Date());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const netAmount = request.amount - request.vatAmount;
  const expenseAccountId = request.category
    ? (await prisma.account.findFirst({ where: { name: request.category.name, type: "EXPENSE" } }))?.id
    : undefined;
  const fallbackExpenseAccountId = expenseAccountId ?? (await getSystemAccountId("5100"));

  const lines: { accountId: string; debit?: number; credit?: number; description?: string }[] = [
    { accountId: fallbackExpenseAccountId, debit: netAmount, description: request.description },
  ];
  if (request.vatAmount > 0) {
    const vatAccountId = await getSystemAccountId("1150");
    lines.push({ accountId: vatAccountId, debit: request.vatAmount, description: `ضريبة مدخلات — ${request.description}` });
  }
  lines.push({ accountId: request.payee.accountId, credit: request.amount, description: `إقفال دفعة — ${request.requestNumber}` });

  const journalEntry = await postJournalEntry({
    description: `إقفال فاتورة مورد — ${request.requestNumber} — ${request.description}`,
    sourceType: "PAYMENT_REQUEST_CLOSE",
    sourceId: request.id,
    createdById: user.id,
    lines,
  });

  const updated = await prisma.paymentRequest.update({
    where: { id: params.id },
    data: {
      status: "CLOSED",
      closedById: user.id,
      closedAt: new Date(),
      closingJournalEntryId: journalEntry.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityType: "PaymentRequest",
    entityId: params.id,
    description: `أقفل فاتورة مورد لطلب صرف: ${request.requestNumber} ورحّل قيد المصروف الفعلي`,
  });

  return NextResponse.json(updated);
}
