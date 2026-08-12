import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("paymentStatus" in body) data.paymentStatus = body.paymentStatus;
  if ("paidAmount" in body) data.paidAmount = Number(body.paidAmount);
  if ("description" in body) data.description = body.description;

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
