import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upgradeChartHierarchy } from "@/lib/accounting";
import { logAudit } from "@/lib/audit";
import { hasAccountingPermission, accountingPermissionError } from "@/lib/accountingPermissions";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const allowed = await hasAccountingPermission(user.id, user.role, "chartReset");
  if (!allowed) {
    return NextResponse.json({ error: accountingPermissionError("chartReset") }, { status: 403 });
  }

  // حذف كل القيود اليومية (يحذف سطورها تلقائياً بالتتابع)، ثم كل الحسابات
  await prisma.journalEntry.deleteMany({});
  await prisma.account.deleteMany({});

  // إعادة بناء الدليل النظيف الكامل بـ3 مستويات
  await upgradeChartHierarchy();

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "RESET",
    entityType: "ChartOfAccounts",
    description: "أعاد تعيين دليل الحسابات وكل القيود اليومية بالكامل",
  });

  return NextResponse.json({ ok: true });
}
