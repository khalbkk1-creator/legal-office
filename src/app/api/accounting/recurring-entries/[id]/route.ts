import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("isActive" in body) data.isActive = !!body.isActive;
  if ("description" in body) data.description = (body.description || "").trim();
  if ("dayOfMonth" in body) data.dayOfMonth = Number(body.dayOfMonth) || 1;

  if (Array.isArray(body.lines)) {
    const lines = body.lines as { accountId: string; debit?: number; credit?: number }[];
    const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100) || totalDebit === 0) {
      return NextResponse.json({ error: "القيد غير متوازن" }, { status: 400 });
    }
    await prisma.recurringEntryLine.deleteMany({ where: { recurringEntryId: params.id } });
    data.lines = { create: lines.map((l) => ({ accountId: l.accountId, debit: l.debit ?? 0, credit: l.credit ?? 0 })) };
  }

  const updated = await prisma.recurringEntry.update({
    where: { id: params.id },
    data,
    include: { lines: { include: { account: true } } },
  });

  if ("description" in body || Array.isArray(body.lines)) {
    const user = session.user as any;
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityType: "RecurringEntry",
      entityId: params.id,
      description: `عدّل قيد متكرر: ${updated.description}`,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entry = await prisma.recurringEntry.findUnique({ where: { id: params.id } });
  if (!entry) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.recurringEntry.delete({ where: { id: params.id } });

  const user = session.user as any;
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityType: "RecurringEntry",
    entityId: params.id,
    description: `حذف قيد متكرر: ${entry.description}`,
  });

  return NextResponse.json({ ok: true });
}
