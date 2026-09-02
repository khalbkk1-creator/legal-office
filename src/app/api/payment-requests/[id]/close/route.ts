import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postJournalEntry, getSystemAccountId, assertDateNotLocked } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";
import { logPaymentActivity } from "@/lib/paymentActivity";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const sessionUser = session.user as any;
  const actingUser = await prisma.user.findUnique({ where: { id: sessionUser.id }, include: { position: true } });
  if (!actingUser) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const isPartner = actingUser.role === "PARTNER";
  const isAccountant = !!actingUser.position?.isAccountant;
  if (!isPartner && !isAccountant) {
    return NextResponse.json({ error: "إقفال الفاتورة متاح للمحاسب أو الشريك فقط" }, { status: 403 });
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
    createdById: actingUser.id,
    lines,
  });

  const updated = await prisma.paymentRequest.update({
    where: { id: params.id },
    data: {
      status: "CLOSED",
      closedById: actingUser.id,
      closedAt: new Date(),
      closingJournalEntryId: journalEntry.id,
    },
  });

  await logAudit({
    userId: actingUser.id,
    userName: actingUser.name,
    action: "UPDATE",
    entityType: "PaymentRequest",
    entityId: params.id,
    description: `أقفل فاتورة مورد لطلب صرف: ${request.requestNumber} ورحّل قيد المصروف الفعلي`,
  });

  await logPaymentActivity({ requestId: params.id, userId: actingUser.id, userName: actingUser.name, action: "CLOSED" });

  return NextResponse.json(updated);
}
