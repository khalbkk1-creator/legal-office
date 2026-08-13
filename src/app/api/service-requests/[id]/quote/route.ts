import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count({
    where: { quoteNumber: { startsWith: `QUO-${year}-` } },
  });
  const next = (count + 1).toString().padStart(4, "0");
  return `QUO-${year}-${next}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const request = await prisma.serviceRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  const body = await req.json();
  const description = (body.description || "").trim();
  const amount = Number(body.amount);
  const applyVat = body.applyVat !== false;

  if (!description || !amount || amount <= 0) {
    return NextResponse.json({ error: "الوصف والمبلغ مطلوبان" }, { status: 400 });
  }

  const vatAmount = applyVat ? Math.round(amount * 0.15 * 100) / 100 : 0;
  const totalAmount = amount + vatAmount;
  const user = session.user as any;
  const quoteNumber = await nextQuoteNumber();

  const quotation = await prisma.quotation.create({
    data: {
      quoteNumber,
      clientId: request.clientId,
      description,
      amount,
      applyVat,
      vatAmount,
      totalAmount,
      createdById: user.id,
    },
  });

  const updated = await prisma.serviceRequest.update({
    where: { id: params.id },
    data: { quotationId: quotation.id, status: "QUOTE_SENT" },
    include: { client: true, quotation: true, documents: { include: { category: true } } },
  });

  return NextResponse.json(updated, { status: 201 });
}
