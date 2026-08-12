import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const quoteSchema = z.object({
  clientId: z.string().min(1),
  caseId: z.string().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
  applyVat: z.boolean().default(true),
  validUntil: z.string().optional(),
});

async function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count({
    where: { quoteNumber: { startsWith: `QUO-${year}-` } },
  });
  const next = (count + 1).toString().padStart(4, "0");
  return `QUO-${year}-${next}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const quotes = await prisma.quotation.findMany({
    include: { client: true, case: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { clientId, caseId, description, amount, applyVat, validUntil } = parsed.data;
  const vatAmount = applyVat ? Math.round(amount * 0.15 * 100) / 100 : 0;
  const totalAmount = amount + vatAmount;

  const user = session.user as any;
  const quoteNumber = await nextQuoteNumber();

  const created = await prisma.quotation.create({
    data: {
      quoteNumber,
      clientId,
      caseId: caseId || undefined,
      description,
      amount,
      applyVat,
      vatAmount,
      totalAmount,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      createdById: user.id,
    },
    include: { client: true, case: true },
  });

  return NextResponse.json(created, { status: 201 });
}
