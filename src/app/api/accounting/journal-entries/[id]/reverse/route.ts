import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postJournalEntry } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const original = await prisma.journalEntry.findUnique({
    where: { id: params.id },
    include: { lines: true, reversedBy: true },
  });
  if (!original) return NextResponse.json({ error: "القيد غير موجود" }, { status: 404 });
  if (original.reversedBy) {
    return NextResponse.json({ error: "تم عكس هذا القيد مسبقاً" }, { status: 400 });
  }
  if (original.reversalOfId) {
    return NextResponse.json({ error: "لا يمكن عكس قيد عكسي" }, { status: 400 });
  }

  const user = session.user as any;

  const reversal = await postJournalEntry({
    description: `عكس قيد رقم ${original.entryNumber} — ${original.description}`,
    sourceType: "REVERSAL",
    sourceId: original.id,
    createdById: user.id,
    lines: original.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.credit,
      credit: l.debit,
      description: l.description ?? undefined,
    })),
  });

  await prisma.journalEntry.update({
    where: { id: reversal.id },
    data: { reversalOfId: original.id },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "REVERSE",
    entityType: "JournalEntry",
    entityId: original.id,
    description: `عكس قيد: ${original.entryNumber} بالقيد الجديد ${reversal.entryNumber}`,
  });

  return NextResponse.json(reversal, { status: 201 });
}
