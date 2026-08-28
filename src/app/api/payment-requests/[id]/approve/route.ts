import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json().catch(() => ({}));
  const note = (body.note || "").trim() || undefined;

  const request = await prisma.paymentRequest.findUnique({
    where: { id: params.id },
    include: { payee: true, requestedBy: true, category: true },
  });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  if (request.status === "PENDING_MANAGER") {
    const isManager = request.requestedBy.managerId === user.id;
    if (!isManager && user.role !== "PARTNER") {
      return NextResponse.json({ error: "الاعتماد بهذه المرحلة متاح لمدير الموظف أو الشريك فقط" }, { status: 403 });
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: params.id },
      data: { status: "PENDING_FINANCE", managerApprovedById: user.id, managerApprovedAt: new Date(), managerNote: note },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityType: "PaymentRequest",
      entityId: params.id,
      description: `اعتمد (كمدير) طلب صرف: ${request.requestNumber}`,
    });

    return NextResponse.json(updated);
  }

  if (request.status === "PENDING_FINANCE") {
    if (user.role !== "PARTNER") {
      return NextResponse.json({ error: "اعتماد المالية متاح للشريك فقط" }, { status: 403 });
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        financeApprovedById: user.id,
        financeApprovedAt: new Date(),
        financeNote: note,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityType: "PaymentRequest",
      entityId: params.id,
      description: `اعتمد (كمالية) طلب صرف: ${request.requestNumber}`,
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "هذا الطلب ليس بمرحلة قابلة للاعتماد" }, { status: 400 });
}
