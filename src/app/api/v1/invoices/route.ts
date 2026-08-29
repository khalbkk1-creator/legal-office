import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const authorized = await verifyApiKey(req);
  if (!authorized) return NextResponse.json({ error: "مفتاح API غير صحيح أو غير مفعّل" }, { status: 401 });

  const invoices = await prisma.sale.findMany({
    select: {
      id: true,
      invoiceNumber: true,
      description: true,
      amount: true,
      vatAmount: true,
      totalAmount: true,
      paidAmount: true,
      paymentStatus: true,
      saleDate: true,
      client: { select: { id: true, name: true, phone: true, email: true } },
    },
    orderBy: { saleDate: "desc" },
    take: 200,
  });

  return NextResponse.json({ data: invoices });
}
