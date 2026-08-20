import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemAccountId, postJournalEntry } from "@/lib/accounting";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: { client: true, case: true },
  });
  if (!sale) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(sale);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  const existing = await prisma.sale.findUnique({ where: { id: params.id } });

  if ("paymentStatus" in body) data.paymentStatus = body.paymentStatus;
  if ("paidAmount" in body) data.paidAmount = Number(body.paidAmount);
  if ("description" in body) data.description = body.description;
  if ("clientId" in body) data.clientId = body.clientId;
  if ("caseId" in body) data.caseId = body.caseId || null;
  if ("saleDate" in body) data.saleDate = body.saleDate ? new Date(body.saleDate) : undefined;

  if ("amount" in body || "applyVat" in body) {
    const current = await prisma.sale.findUnique({ where: { id: params.id } });
    const amount = "amount" in body ? Number(body.amount) : current?.amount ?? 0;
    const applyVat = "applyVat" in body ? Boolean(body.applyVat) : current?.applyVat ?? true;
    const vatAmount = applyVat ? Math.round(amount * 0.15 * 100) / 100 : 0;
    data.amount = amount;
    data.applyVat = applyVat;
    data.vatAmount = vatAmount;
    data.totalAmount = amount + vatAmount;
  }

  const updated = await prisma.sale.update({
    where: { id: params.id },
    data,
    include: { client: true, case: true },
  });

  if ("paidAmount" in body && existing) {
    const paymentDelta = updated.paidAmount - existing.paidAmount;
    if (paymentDelta > 0) {
      try {
        const session2 = session.user as any;
        const [cashAccount, arAccount] = await Promise.all([
          body.paymentAccountId ? Promise.resolve(body.paymentAccountId as string) : getSystemAccountId("1010"),
          getSystemAccountId("1100"),
        ]);
        await postJournalEntry({
          description: `تحصيل دفعة — فاتورة ${updated.invoiceNumber}`,
          sourceType: "PAYMENT",
          sourceId: updated.id,
          createdById: session2.id,
          date: body.paymentDate ? new Date(body.paymentDate) : undefined,
          lines: [
            { accountId: cashAccount, debit: paymentDelta, description: `تحصيل ${updated.invoiceNumber}` },
            { accountId: arAccount, credit: paymentDelta, description: `تحصيل ${updated.invoiceNumber}` },
          ],
        });
      } catch (e) {
        console.error("Journal posting failed for payment:", e);
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  await prisma.sale.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
