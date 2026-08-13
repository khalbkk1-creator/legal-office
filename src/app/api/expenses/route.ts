import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const expenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  expenseDate: z.string().optional(),
  categoryId: z.string().optional(),
  caseId: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const expenses = await prisma.expense.findMany({
    include: { category: true, case: true },
    orderBy: { expenseDate: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { description, amount, expenseDate, categoryId, caseId } = parsed.data;
  const user = session.user as any;

  const created = await prisma.expense.create({
    data: {
      description,
      amount,
      expenseDate: expenseDate ? new Date(expenseDate) : undefined,
      categoryId: categoryId || undefined,
      caseId: caseId || undefined,
      createdById: user.id,
    },
    include: { category: true, case: true },
  });

  return NextResponse.json(created, { status: 201 });
}
