import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSystemAccountId, postJournalEntry } from "@/lib/accounting";

const saleSchema = z.object({
  clientId: z.string().min(1),
  caseId: z.string().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
  applyVat: z.boolean().default(true),
  saleDate: z.string().optional(),
});

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.sale.count({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
  });
  const next = (count + 1).toString().padStart(4, "0");
  return `INV-${year}-${next}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const sales = await prisma.sale.findMany({
    include: { client: true, case: true },
    orderBy: { saleDate: "desc" },
  });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { clientId, caseId, description, amount, applyVat, saleDate } = parsed.data;
  const vatAmount = applyVat ? Math.round(amount * 0.15 * 100) / 100 : 0;
  const totalAmount = amount + vatAmount;

  const user = session.user as any;
  const invoiceNumber = await nextInvoiceNumber();

  const created = await prisma.sale.create({
    data: {
      invoiceNumber,
      clientId,
      caseId: caseId || undefined,
      description,
      amount,
      applyVat,
      vatAmount,
      totalAmount,
      saleDate: saleDate ? new Date(saleDate) : undefined,
      createdById: user.id,
    },
    include: { client: true, case: true },
  });

  try {
    const [arAccount, revenueAccount, vatAccount] = await Promise.all([
      getSystemAccountId("1100"),
      getSystemAccountId("4100"),
      getSystemAccountId("2200"),
    ]);
    const lines = [
      { accountId: arAccount, debit: totalAmount, description: `فاتورة ${invoiceNumber}` },
      { accountId: revenueAccount, credit: amount, description: `فاتورة ${invoiceNumber}` },
    ];
    if (vatAmount > 0) {
      lines.push({ accountId: vatAccount, credit: vatAmount, description: `ضريبة فاتورة ${invoiceNumber}` });
    }
    await postJournalEntry({
      description: `فاتورة عميل — ${invoiceNumber}`,
      sourceType: "SALE",
      sourceId: created.id,
      createdById: user.id,
      lines,
    });
  } catch (e) {
    console.error("Journal posting failed for sale:", e);
  }

  return NextResponse.json(created, { status: 201 });
}
