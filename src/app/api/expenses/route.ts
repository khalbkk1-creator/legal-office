import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSystemAccountId, getOrCreateExpenseAccount, postJournalEntry, assertDateNotLocked } from "@/lib/accounting";

const expenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  vatAmount: z.number().min(0).optional(),
  expenseDate: z.string().optional(),
  categoryId: z.string().optional(),
  caseId: z.string().optional(),
  paymentAccountId: z.string().optional(),
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

  const { description, amount, vatAmount, expenseDate, categoryId, caseId, paymentAccountId } = parsed.data;
  const user = session.user as any;
  const vat = vatAmount ?? 0;
  const netExpense = amount - vat;

  const resolvedExpenseDate = expenseDate ? new Date(expenseDate) : new Date();
  try {
    await assertDateNotLocked(resolvedExpenseDate);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const created = await prisma.expense.create({
    data: {
      description,
      amount,
      vatAmount: vat,
      expenseDate: resolvedExpenseDate,
      categoryId: categoryId || undefined,
      caseId: caseId || undefined,
      createdById: user.id,
    },
    include: { category: true, case: true },
  });

  try {
    const [expenseAccount, cashAccount, vatAccount] = await Promise.all([
      getOrCreateExpenseAccount(created.category?.name),
      paymentAccountId ? Promise.resolve(paymentAccountId) : getSystemAccountId("1010"),
      vat > 0 ? getSystemAccountId("1150") : Promise.resolve(null),
    ]);
    const lines: { accountId: string; debit?: number; credit?: number; description?: string }[] = [
      { accountId: expenseAccount, debit: netExpense, description },
    ];
    if (vat > 0 && vatAccount) {
      lines.push({ accountId: vatAccount, debit: vat, description: `ضريبة مدخلات — ${description}` });
    }
    lines.push({ accountId: cashAccount, credit: amount, description });

    await postJournalEntry({
      description: `مصروف — ${description}`,
      sourceType: "EXPENSE",
      sourceId: created.id,
      date: created.expenseDate,
      createdById: user.id,
      lines,
    });
  } catch (e) {
    console.error("Journal posting failed for expense:", e);
  }

  return NextResponse.json(created, { status: 201 });
}
