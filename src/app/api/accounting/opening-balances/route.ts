import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upgradeChartHierarchy, postJournalEntry, getSystemAccountId } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";
import { hasAccountingPermission, accountingPermissionError } from "@/lib/accountingPermissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entry = await prisma.journalEntry.findFirst({
    where: { sourceType: "OPENING_BALANCE" },
    include: { lines: true },
  });
  return NextResponse.json(entry);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const allowed = await hasAccountingPermission(user.id, user.role, "openingBalances");
  if (!allowed) {
    return NextResponse.json({ error: accountingPermissionError("openingBalances") }, { status: 403 });
  }

  await upgradeChartHierarchy();

  const body = await req.json();
  const date = body.date ? new Date(body.date) : new Date();
  const balances = body.balances as { accountId: string; amount: number }[];

  if (!Array.isArray(balances) || balances.length === 0) {
    return NextResponse.json({ error: "لا توجد أرصدة لحفظها" }, { status: 400 });
  }

  const equityAccountId = await getSystemAccountId("3300");
  const accounts = await prisma.account.findMany({
    where: { id: { in: balances.map((b) => b.accountId) } },
  });
  const accountById: Record<string, (typeof accounts)[number]> = {};
  for (const a of accounts) accountById[a.id] = a;

  const lines: { accountId: string; debit?: number; credit?: number; description?: string }[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const b of balances) {
    if (!b.amount || b.amount === 0) continue;
    const account = accountById[b.accountId];
    if (!account || account.id === equityAccountId) continue;
    const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
    if (isDebitNormal) {
      lines.push({ accountId: account.id, debit: b.amount, description: `رصيد افتتاحي — ${account.name}` });
      totalDebit += b.amount;
    } else {
      lines.push({ accountId: account.id, credit: b.amount, description: `رصيد افتتاحي — ${account.name}` });
      totalCredit += b.amount;
    }
  }

  if (lines.length === 0) {
    return NextResponse.json({ error: "كل الأرصدة صفر، لا يوجد شي لحفظه" }, { status: 400 });
  }

  const diff = totalDebit - totalCredit;
  if (diff > 0) {
    lines.push({ accountId: equityAccountId, credit: diff, description: "موازنة الأرصدة الافتتاحية" });
  } else if (diff < 0) {
    lines.push({ accountId: equityAccountId, debit: -diff, description: "موازنة الأرصدة الافتتاحية" });
  }

  // حذف أي قيد أرصدة افتتاحية سابق لتفادي التكرار
  await prisma.journalEntry.deleteMany({ where: { sourceType: "OPENING_BALANCE" } });

  const created = await postJournalEntry({
    description: "الأرصدة الافتتاحية",
    sourceType: "OPENING_BALANCE",
    createdById: user.id,
    date,
    lines,
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityType: "OpeningBalance",
    entityId: created.id,
    description: `سجّل/عدّل الأرصدة الافتتاحية بتاريخ ${date.toLocaleDateString("ar-SA")}`,
  });

  return NextResponse.json(created, { status: 201 });
}
