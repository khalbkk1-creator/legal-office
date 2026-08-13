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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const caseItem = await prisma.case.findUnique({ where: { id: params.id } });
  if (!caseItem) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });

  const unbilled = await prisma.timeEntry.findMany({ where: { caseId: params.id, billed: false } });
  if (unbilled.length === 0) {
    return NextResponse.json({ error: "لا توجد ساعات غير مفوترة" }, { status: 400 });
  }

  const body = await req.json();
  const applyVat = body.applyVat !== false;

  const amount = unbilled.reduce((sum, e) => sum + (e.minutes / 60) * e.hourlyRate, 0);
  const roundedAmount = Math.round(amount * 100) / 100;
  const vatAmount = applyVat ? Math.round(roundedAmount * 0.15 * 100) / 100 : 0;
  const totalAmount = roundedAmount + vatAmount;

  const user = session.user as any;
  const invoiceNumber = await nextInvoiceNumber();
  const totalHours = (unbilled.reduce((sum, e) => sum + e.minutes, 0) / 60).toFixed(2);

  const sale = await prisma.sale.create({
    data: {
      invoiceNumber,
      clientId: caseItem.clientId,
      caseId: caseItem.id,
      description: `أتعاب أعمال — ${totalHours} ساعة على القضية ${caseItem.caseNumber}`,
      amount: roundedAmount,
      applyVat,
      vatAmount,
      totalAmount,
      createdById: user.id,
    },
  });

  await prisma.timeEntry.updateMany({
    where: { id: { in: unbilled.map((e) => e.id) } },
    data: { billed: true, saleId: sale.id },
  });

  return NextResponse.json(sale, { status: 201 });
}
