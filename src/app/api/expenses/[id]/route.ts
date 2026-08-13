import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    include: { category: true, case: true },
  });
  if (!expense) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(expense);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("description" in body) data.description = body.description;
  if ("amount" in body) data.amount = Number(body.amount);
  if ("expenseDate" in body) data.expenseDate = body.expenseDate ? new Date(body.expenseDate) : undefined;
  if ("categoryId" in body) data.categoryId = body.categoryId || null;
  if ("caseId" in body) data.caseId = body.caseId || null;

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data,
    include: { category: true, case: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  await prisma.expense.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
