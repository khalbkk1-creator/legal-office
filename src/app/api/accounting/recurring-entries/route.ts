import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasAccountingPermission, accountingPermissionError } from "@/lib/accountingPermissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const templates = await prisma.recurringEntry.findMany({
    include: { lines: { include: { account: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const allowed = await hasAccountingPermission(user.id, user.role, "record");
  if (!allowed) {
    return NextResponse.json({ error: accountingPermissionError("record") }, { status: 403 });
  }

  const body = await req.json();
  const description = (body.description || "").trim();
  const dayOfMonth = Number(body.dayOfMonth) || 1;
  const lines = body.lines as { accountId: string; debit?: number; credit?: number }[];

  if (!description || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "الوصف وسطرين على الأقل مطلوبة" }, { status: 400 });
  }

  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
    return NextResponse.json({ error: "القيد غير متوازن" }, { status: 400 });
  }

  const created = await prisma.recurringEntry.create({
    data: {
      description,
      dayOfMonth,
      createdById: user.id,
      lines: {
        create: lines.map((l) => ({ accountId: l.accountId, debit: l.debit ?? 0, credit: l.credit ?? 0 })),
      },
    },
    include: { lines: { include: { account: true } } },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityType: "RecurringEntry",
    entityId: created.id,
    description: `أنشأ قيد متكرر: ${description}`,
  });

  return NextResponse.json(created, { status: 201 });
}
