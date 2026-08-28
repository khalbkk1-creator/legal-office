import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const sessionUser = session.user as any;
  const body = await req.json().catch(() => ({}));
  const note = (body.note || "").trim() || undefined;

  const [request, actingUser] = await Promise.all([
    prisma.paymentRequest.findUnique({
      where: { id: params.id },
      include: { requestedBy: true },
    }),
    prisma.user.findUnique({ where: { id: sessionUser.id }, include: { position: true } }),
  ]);
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  if (!actingUser) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const isPartner = actingUser.role === "PARTNER";
  const isAccountant = !!actingUser.position?.isAccountant;
  const isFinancialManager = !!actingUser.position?.isFinancialManager;

  if (request.status === "PENDING_MANAGER") {
    const isManager = request.requestedBy.managerId === actingUser.id;
    if (!isManager && !isPartner) {
      return NextResponse.json({ error: "الاعتماد بهذه المرحلة متاح لمدير الموظف أو الشريك فقط" }, { status: 403 });
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: params.id },
      data: { status: "PENDING_ACCOUNTANT", managerApprovedById: actingUser.id, managerApprovedAt: new Date(), managerNote: note },
    });

    await logAudit({
      userId: actingUser.id,
      userName: actingUser.name,
      action: "UPDATE",
      entityType: "PaymentRequest",
      entityId: params.id,
      description: `اعتمد (كمدير) طلب صرف: ${request.requestNumber}`,
    });

    return NextResponse.json(updated);
  }

  if (request.status === "PENDING_ACCOUNTANT") {
    if (!isAccountant && !isPartner) {
      return NextResponse.json({ error: "الاعتماد بهذه المرحلة متاح للمحاسب أو الشريك فقط" }, { status: 403 });
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: params.id },
      data: { status: "PENDING_FINANCE", accountantApprovedById: actingUser.id, accountantApprovedAt: new Date(), accountantNote: note },
    });

    await logAudit({
      userId: actingUser.id,
      userName: actingUser.name,
      action: "UPDATE",
      entityType: "PaymentRequest",
      entityId: params.id,
      description: `اعتمد (كمحاسب) طلب صرف: ${request.requestNumber}`,
    });

    return NextResponse.json(updated);
  }

  if (request.status === "PENDING_FINANCE") {
    if (!isFinancialManager && !isPartner) {
      return NextResponse.json({ error: "الاعتماد النهائي متاح للمدير المالي أو الشريك فقط" }, { status: 403 });
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: params.id },
      data: { status: "APPROVED", financeApprovedById: actingUser.id, financeApprovedAt: new Date(), financeNote: note },
    });

    await logAudit({
      userId: actingUser.id,
      userName: actingUser.name,
      action: "UPDATE",
      entityType: "PaymentRequest",
      entityId: params.id,
      description: `اعتمد (كمدير مالي) طلب صرف: ${request.requestNumber} — رجع للموظف لتنفيذ الصرف`,
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "هذا الطلب ليس بمرحلة قابلة للاعتماد" }, { status: 400 });
}
