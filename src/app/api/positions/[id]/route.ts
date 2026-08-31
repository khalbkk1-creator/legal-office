import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACCOUNTING_FIELDS = [
  "acctJournalCreate",
  "acctJournalConfirm",
  "acctJournalEdit",
  "acctJournalDelete",
  "acctJournalReverse",
  "acctJournalAttach",
  "acctChartCreate",
  "acctChartEdit",
  "acctChartDelete",
  "acctChartReset",
  "acctPeriodLock",
  "acctOpeningBalances",
  "acctRecurringManage",
  "acctRecurringPost",
  "acctReconciliationManage",
  "acctReconciliationSave",
  "acctViewOnly",
];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const sessionUser = session.user as any;
  const role = sessionUser.role;
  const body = await req.json();

  // هل الطلب يخص صلاحيات المحاسبة فقط بدون أي حقل آخر؟
  const bodyKeys = Object.keys(body);
  const isAccountingOnlyRequest = bodyKeys.length > 0 && bodyKeys.every((k) => ACCOUNTING_FIELDS.includes(k));

  if (isAccountingOnlyRequest) {
    // المدير المالي يقدر يتحكم بصلاحيات المحاسبة بس، بدون صلاحية الشريك الكاملة
    const currentUser = await prisma.user.findUnique({ where: { id: sessionUser.id }, include: { position: true } });
    const isFinancialManager = !!currentUser?.position?.isFinancialManager;
    if (role !== "PARTNER" && !isFinancialManager) {
      return NextResponse.json({ error: "إدارة صلاحيات المحاسبة متاحة للمدير المالي أو الشريك فقط" }, { status: 403 });
    }
  } else if (role !== "PARTNER") {
    return NextResponse.json({ error: "إدارة المسميات الوظيفية متاحة للشريك فقط" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (Array.isArray(body.allowedModules)) data.allowedModules = body.allowedModules;
  if ("isAccountant" in body) data.isAccountant = !!body.isAccountant;
  if ("isFinancialManager" in body) data.isFinancialManager = !!body.isFinancialManager;
  if ("departmentId" in body) data.departmentId = body.departmentId || null;
  for (const field of ACCOUNTING_FIELDS) {
    if (field in body) data[field] = !!body[field];
  }

  const updated = await prisma.position.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "إدارة المسميات الوظيفية متاحة للشريك فقط" }, { status: 403 });
  }

  const usersWithPosition = await prisma.user.count({ where: { positionId: params.id } });
  if (usersWithPosition > 0) {
    return NextResponse.json(
      { error: "لا يمكن حذف مسمى وظيفي مرتبط بمستخدمين، غيّر مسماهم أولاً" },
      { status: 400 }
    );
  }

  await prisma.position.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
