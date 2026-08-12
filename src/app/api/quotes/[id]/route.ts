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
