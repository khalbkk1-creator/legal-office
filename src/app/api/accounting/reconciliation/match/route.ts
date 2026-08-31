import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingPermission, accountingPermissionError } from "@/lib/accountingPermissions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const allowed = await hasAccountingPermission(user.id, user.role, "reconciliationManage");
  if (!allowed) {
    return NextResponse.json({ error: accountingPermissionError("reconciliationManage") }, { status: 403 });
  }

  const body = await req.json();

  if (body.action === "auto") {
    const accountId = body.accountId as string;
    const [statementLines, journalLines] = await Promise.all([
      prisma.bankStatementLine.findMany({ where: { accountId, matched: false } }),
      prisma.journalEntryLine.findMany({ where: { accountId, journalEntry: { status: "POSTED" } } }),
    ]);

    const usedJournalLineIds = new Set<string>();
    let matchedCount = 0;

    for (const s of statementLines) {
      const candidate = journalLines.find((j) => {
        if (usedJournalLineIds.has(j.id)) return false;
        const journalAmount = j.debit > 0 ? j.debit : -j.credit;
        return Math.abs(journalAmount - s.amount) < 0.01;
      });
      if (candidate) {
        usedJournalLineIds.add(candidate.id);
        await prisma.bankStatementLine.update({
          where: { id: s.id },
          data: { matched: true, matchedLineId: candidate.id },
        });
        matchedCount++;
      }
    }

    return NextResponse.json({ ok: true, matchedCount });
  }

  // مطابقة يدوية أو فك مطابقة
  const statementLineId = body.statementLineId as string;
  const journalLineId = body.journalLineId as string | null;

  const updated = await prisma.bankStatementLine.update({
    where: { id: statementLineId },
    data: { matched: !!journalLineId, matchedLineId: journalLineId || null },
  });

  return NextResponse.json(updated);
}
