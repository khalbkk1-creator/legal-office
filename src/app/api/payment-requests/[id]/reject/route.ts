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
  const reason = (body.reason || "").trim();
  if (!reason) return NextResponse.json({ error: "سبب الرفض مطلوب" }, { status: 400 });

  const request = await prisma.paymentRequest.findUnique({
    where: { id: params.id },
    include: { requestedBy: true },
  });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  if (request.status === "PENDING_MANAGER") {
    const isManager = request.requestedBy.managerId === user.id;
    if (!isManager && user.role !== "PARTNER") {
      return NextResponse.json({ error: "الرفض بهذه المرحلة متاح لمدير الموظف أو الشريك فقط" }, { status: 403 });
    }
  } else if (request.status === "PENDING_FINANCE") {
    if (user.role !== "PARTNER") {
      return NextResponse.json({ error: "رفض المالية متاح للشريك فقط" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "هذا الطلب ليس بمرحلة قابلة للرفض" }, { status: 400 });
  }

  const updated = await prisma.paymentRequest.update({
    where: { id: params.id },
    data: { status: "REJECTED", rejectedById: user.id, rejectedAt: new Date(), rejectionReason: reason },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityType: "PaymentRequest",
    entityId: params.id,
    description: `رفض طلب صرف: ${request.requestNumber} — السبب: ${reason}`,
  });

  return NextResponse.json(updated);
}
