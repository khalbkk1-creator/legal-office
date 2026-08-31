import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasAccountingPermission, accountingPermissionError } from "@/lib/accountingPermissions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId مطلوب" }, { status: 400 });

  const records = await prisma.reconciliationRecord.findMany({
    where: { accountId },
    include: { createdBy: true },
    orderBy: { reconciledDate: "desc" },
  });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const allowed = await hasAccountingPermission(user.id, user.role, "reconciliationSave");
  if (!allowed) {
    return NextResponse.json({ error: accountingPermissionError("reconciliationSave") }, { status: 403 });
  }

  const body = await req.json();
  const accountId = body.accountId as string;
  const reconciledDate = body.reconciledDate ? new Date(body.reconciledDate) : new Date();
  const bankBalance = Number(body.bankBalance);
  const notes = (body.notes || "").trim() || undefined;

  if (!accountId || isNaN(bankBalance)) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  const sums = await prisma.journalEntryLine.aggregate({
    where: { accountId, journalEntry: { status: "POSTED" } },
    _sum: { debit: true, credit: true },
  });
  const debit = sums._sum.debit ?? 0;
  const credit = sums._sum.credit ?? 0;
  const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
  const bookBalance = isDebitNormal ? debit - credit : credit - debit;
  const difference = bankBalance - bookBalance;

  const created = await prisma.reconciliationRecord.create({
    data: {
      accountId,
      reconciledDate,
      bookBalance,
      bankBalance,
      difference,
      notes,
      createdById: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityType: "ReconciliationRecord",
    entityId: created.id,
    description: `حفظ ملخص مطابقة بنكية لحساب ${account.code} — ${account.name} بتاريخ ${reconciledDate.toLocaleDateString("ar-SA")}`,
  });

  return NextResponse.json(created, { status: 201 });
}
