import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "إدارة المسميات الوظيفية متاحة للشريك فقط" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (Array.isArray(body.allowedModules)) data.allowedModules = body.allowedModules;
  if ("isAccountant" in body) data.isAccountant = !!body.isAccountant;
  if ("isFinancialManager" in body) data.isFinancialManager = !!body.isFinancialManager;
  if ("departmentId" in body) data.departmentId = body.departmentId || null;
  if ("acctCanRecord" in body) data.acctCanRecord = !!body.acctCanRecord;
  if ("acctCanEditPosted" in body) data.acctCanEditPosted = !!body.acctCanEditPosted;
  if ("acctCanManageChart" in body) data.acctCanManageChart = !!body.acctCanManageChart;
  if ("acctCanManagePeriods" in body) data.acctCanManagePeriods = !!body.acctCanManagePeriods;
  if ("acctViewOnly" in body) data.acctViewOnly = !!body.acctViewOnly;

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
