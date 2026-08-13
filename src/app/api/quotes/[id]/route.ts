import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.sale.count({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
  });
  const next = (count + 1).toString().padStart(4, "0");
  return `INV-${year}-${next}`;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const quote = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: { client: true, case: true },
  });
  if (!quote) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(quote);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();

  if (body.action === "CONVERT_TO_SALE") {
    const quote = await prisma.quotation.findUnique({ where: { id: params.id } });
    if (!quote) return NextResponse.json({ error: "عرض السعر غير موجود" }, { status: 404 });
    if (quote.convertedSaleId) {
      return NextResponse.json({ error: "تم تحويل هذا العرض لفاتورة مسبقاً" }, { status: 400 });
    }
    if (quote.status === "REJECTED") {
      return NextResponse.json({ error: "لا يمكن تحويل عرض سعر مرفوض لفاتورة" }, { status: 400 });
    }

    const user = session.user as any;
    const invoiceNumber = await nextInvoiceNumber();

    const sale = await prisma.sale.create({
      data: {
        invoiceNumber,
        clientId: quote.clientId,
        caseId: quote.caseId,
        description: quote.description,
        amount: quote.amount,
        applyVat: quote.applyVat,
        vatAmount: quote.vatAmount,
        totalAmount: quote.totalAmount,
        createdById: user.id,
      },
    });

    const updatedQuote = await prisma.quotation.update({
      where: { id: params.id },
      data: { status: "ACCEPTED", convertedSaleId: sale.id },
      include: { client: true, case: true },
    });

    return NextResponse.json(updatedQuote);
  }

  const data: Record<string, unknown> = {};
  if ("status" in body) data.status = body.status;
  if ("description" in body) data.description = body.description;
  if ("clientId" in body) data.clientId = body.clientId;
  if ("caseId" in body) data.caseId = body.caseId || null;
  if ("validUntil" in body) data.validUntil = body.validUntil ? new Date(body.validUntil) : null;

  if ("amount" in body || "applyVat" in body) {
    const current = await prisma.quotation.findUnique({ where: { id: params.id } });
    const amount = "amount" in body ? Number(body.amount) : current?.amount ?? 0;
    const applyVat = "applyVat" in body ? Boolean(body.applyVat) : current?.applyVat ?? true;
    const vatAmount = applyVat ? Math.round(amount * 0.15 * 100) / 100 : 0;
    data.amount = amount;
    data.applyVat = applyVat;
    data.vatAmount = vatAmount;
    data.totalAmount = amount + vatAmount;
  }

  const updated = await prisma.quotation.update({
    where: { id: params.id },
    data,
    include: { client: true, case: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  await prisma.quotation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
