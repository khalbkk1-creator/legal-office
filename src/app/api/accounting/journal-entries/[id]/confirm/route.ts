import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertDateNotLocked } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";
import { hasAccountingPermission, accountingPermissionError } from "@/lib/accountingPermissions";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const allowed = await hasAccountingPermission(user.id, user.role, "journalConfirm");
  if (!allowed) {
    return NextResponse.json({ error: accountingPermissionError("journalConfirm") }, { status: 403 });
  }

  const entry = await prisma.journalEntry.findUnique({ where: { id: params.id } });
  if (!entry) return NextResponse.json({ error: "القيد غير موجود" }, { status: 404 });
  if (entry.status !== "DRAFT") {
    return NextResponse.json({ error: "هذا القيد ليس مسودة" }, { status: 400 });
  }

  try {
    await assertDateNotLocked(entry.date);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const updated = await prisma.journalEntry.update({
    where: { id: params.id },
    data: { status: "POSTED" },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityType: "JournalEntry",
    entityId: params.id,
    description: `اعتمد قيد مسودة: ${entry.entryNumber} — ${entry.description}`,
  });

  return NextResponse.json(updated);
}
