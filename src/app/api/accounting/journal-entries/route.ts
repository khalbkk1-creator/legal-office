import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postJournalEntry, assertDateNotLocked } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";
import { hasAccountingPermission, accountingPermissionError } from "@/lib/accountingPermissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entries = await prisma.journalEntry.findMany({
    include: { lines: { include: { account: true } }, createdBy: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const allowed = await hasAccountingPermission(user.id, user.role, "journalCreate");
  if (!allowed) {
    return NextResponse.json({ error: accountingPermissionError("journalCreate") }, { status: 403 });
  }

  const body = await req.json();
  const description = (body.description || "").trim();
  const lines = body.lines as { accountId: string; debit?: number; credit?: number; description?: string; payeeId?: string | null; clientId?: string | null; costCenterId?: string | null }[];

  if (!description || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "الوصف وسطرين على الأقل مطلوبة" }, { status: 400 });
  }

  // الحسابات التحليلية تفرض اختيار البُعد المناسب على كل سطر
  const accts = await prisma.account.findMany({ where: { id: { in: lines.map((l) => l.accountId) } }, select: { id: true, name: true, analysisType: true } });
  for (const l of lines) {
    const a = accts.find((x) => x.id === l.accountId);
    if (!a) continue;
    if (a.analysisType === "SUPPLIER" && !l.payeeId) return NextResponse.json({ error: `الحساب "${a.name}" تحليلي بالموردين — اختر المورد` }, { status: 400 });
    if (a.analysisType === "CLIENT" && !l.clientId) return NextResponse.json({ error: `الحساب "${a.name}" تحليلي بالعملاء — اختر العميل` }, { status: 400 });
    if (a.analysisType === "COST_CENTER" && !l.costCenterId) return NextResponse.json({ error: `الحساب "${a.name}" تحليلي بمراكز التكلفة — اختر المركز` }, { status: 400 });
  }

  try {
    const entryDate = body.date ? new Date(body.date) : new Date();
    const status = body.status === "DRAFT" ? "DRAFT" : "POSTED";
    if (status === "POSTED") {
      await assertDateNotLocked(entryDate);
    }
    const created = await postJournalEntry({
      description,
      sourceType: "MANUAL",
      createdById: user.id,
      date: entryDate,
      status,
      lines,
    });
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entityType: "JournalEntry",
      entityId: created.id,
      description: `أنشأ قيد يدوي: ${created.entryNumber} — ${description}`,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "تعذر ترحيل القيد" }, { status: 400 });
  }
}
