import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  await prisma.sale.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
