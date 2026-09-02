import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { logPaymentActivity } from "@/lib/paymentActivity";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const sessionUser = session.user as any;
  const body = await req.json().catch(() => ({}));
  const reason = (body.reason || "").trim();
  if (!reason) return NextResponse.json({ error: "سبب الإرجاع مطلوب" }, { status: 400 });

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
      return NextResponse.json({ error: "الإرجاع بهذه المرحلة متاح لمدير الموظف أو الشريك فقط" }, { status: 403 });
    }
  } else if (request.status === "PENDING_ACCOUNTANT") {
    if (!isAccountant && !isPartner) {
      return NextResponse.json({ error: "الإرجاع بهذه المرحلة متاح للمحاسب أو الشريك فقط" }, { status: 403 });
    }
  } else if (request.status === "PENDING_FINANCE") {
    if (!isFinancialManager && !isPartner) {
      return NextResponse.json({ error: "الإرجاع بهذه المرحلة متاح للمدير المالي أو الشريك فقط" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "هذا الطلب ليس بمرحلة قابلة للإرجاع" }, { status: 400 });
  }

  const updated = await prisma.paymentRequest.update({
    where: { id: params.id },
    data: { status: "RETURNED", returnedById: actingUser.id, returnedAt: new Date(), returnReason: reason },
  });

  await logAudit({
    userId: actingUser.id,
    userName: actingUser.name,
    action: "UPDATE",
    entityType: "PaymentRequest",
    entityId: params.id,
    description: `أرجع طلب صرف للتعديل: ${request.requestNumber} — السبب: ${reason}`,
  });

  await logPaymentActivity({ requestId: params.id, userId: actingUser.id, userName: actingUser.name, action: "RETURNED", stage: request.status === "PENDING_MANAGER" ? "MANAGER" : request.status === "PENDING_ACCOUNTANT" ? "ACCOUNTANT" : "FINANCE", note: reason });

  return NextResponse.json(updated);
}
