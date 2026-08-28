import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { assertDateNotLocked } from "@/lib/accounting";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entry = await prisma.journalEntry.findUnique({ where: { id: params.id } });
  if (!entry) return NextResponse.json({ error: "القيد غير موجود" }, { status: 404 });
  if (entry.status !== "DRAFT") {
    return NextResponse.json({ error: "لا يمكن تعديل قيد معتمد، فقط المسودات قابلة للتعديل" }, { status: 400 });
  }

  const body = await req.json();
  const description = (body.description || "").trim();
  const date = body.date ? new Date(body.date) : entry.date;
  const lines = body.lines as { accountId: string; debit?: number; credit?: number; description?: string }[];

  if (!description || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "الوصف وسطرين على الأقل مطلوبة" }, { status: 400 });
  }

  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
    return NextResponse.json({ error: "القيد غير متوازن" }, { status: 400 });
  }

  await prisma.journalEntryLine.deleteMany({ where: { journalEntryId: params.id } });

  const updated = await prisma.journalEntry.update({
    where: { id: params.id },
    data: {
      description,
      date,
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          description: l.description,
        })),
      },
    },
    include: { lines: { include: { account: true } } },
  });

  const user = session.user as any;
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityType: "JournalEntry",
    entityId: params.id,
    description: `عدّل مسودة قيد: ${entry.entryNumber}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entry = await prisma.journalEntry.findUnique({
    where: { id: params.id },
    include: { reversedBy: true },
  });
  if (!entry) return NextResponse.json({ error: "القيد غير موجود" }, { status: 404 });

  try {
    await assertDateNotLocked(entry.date);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  // لو فيه قيد عكسي يشير لهذا القيد، نفك الربط أولاً حتى ما يبقى مرجع معلّق
  if (entry.reversedBy) {
    await prisma.journalEntry.update({
      where: { id: entry.reversedBy.id },
      data: { reversalOfId: null },
    });
  }

  await prisma.journalEntry.delete({ where: { id: params.id } });

  const user = session.user as any;
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityType: "JournalEntry",
    entityId: params.id,
    description: `حذف قيد نهائياً: ${entry.entryNumber} — ${entry.description}`,
  });

  return NextResponse.json({ ok: true });
}
