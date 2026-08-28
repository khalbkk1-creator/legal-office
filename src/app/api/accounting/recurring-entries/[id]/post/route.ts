import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postJournalEntry, assertDateNotLocked } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const template = await prisma.recurringEntry.findUnique({
    where: { id: params.id },
    include: { lines: true },
  });
  if (!template) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const now = new Date();
  const postDate = new Date(now.getFullYear(), now.getMonth(), Math.min(template.dayOfMonth, 28));

  try {
    await assertDateNotLocked(postDate);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const user = session.user as any;

  const created = await postJournalEntry({
    description: template.description,
    sourceType: "RECURRING",
    sourceId: template.id,
    createdById: user.id,
    date: postDate,
    lines: template.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })),
  });

  await prisma.recurringEntry.update({
    where: { id: template.id },
    data: { lastPostedYear: now.getFullYear(), lastPostedMonth: now.getMonth() + 1 },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityType: "RecurringEntry",
    entityId: template.id,
    description: `رحّل قيد متكرر: ${template.description} لهذا الشهر`,
  });

  return NextResponse.json(created, { status: 201 });
}
