import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// الإجراءات المسموحة:
// SEND_FOR_APPROVAL: تحت الدراسة -> تحت الاعتماد
// APPROVE: تحت الاعتماد -> جارية (الشريك فقط)
// CLOSE: جارية -> مغلقة
// HOLD: أي حالة (غير معلقة) -> معلقة (تُحفظ الحالة السابقة)
// RESTORE: معلقة -> الحالة السابقة قبل التعليق
// SEND_BACK: يرجع القضية مرحلة واحدة للخلف (متاح من أي مرحلة عدا "تحت الدراسة" و"معلقة")

const PREVIOUS_STAGE: Record<string, string> = {
  UNDER_APPROVAL: "UNDER_REVIEW",
  ACTIVE: "UNDER_APPROVAL",
  CLOSED: "ACTIVE",
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const body = await req.json();
  const action = body.action as string;

  const item = await prisma.case.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });

  if (action === "SEND_FOR_APPROVAL") {
    if (item.status !== "UNDER_REVIEW") {
      return NextResponse.json({ error: "هذا الإجراء متاح فقط للقضايا تحت الدراسة" }, { status: 400 });
    }
    const updated = await prisma.case.update({
      where: { id: params.id },
      data: { status: "UNDER_APPROVAL" },
    });
    return NextResponse.json(updated);
  }

  if (action === "APPROVE") {
    if (role !== "PARTNER") {
      return NextResponse.json({ error: "اعتماد القضايا متاح للشريك فقط" }, { status: 403 });
    }
    if (item.status !== "UNDER_APPROVAL") {
      return NextResponse.json({ error: "هذا الإجراء متاح فقط للقضايا تحت الاعتماد" }, { status: 400 });
    }
    const updated = await prisma.case.update({
      where: { id: params.id },
      data: { status: "ACTIVE" },
    });
    return NextResponse.json(updated);
  }

  if (action === "CLOSE") {
    if (item.status !== "ACTIVE") {
      return NextResponse.json({ error: "هذا الإجراء متاح فقط للقضايا الجارية" }, { status: 400 });
    }
    const updated = await prisma.case.update({
      where: { id: params.id },
      data: { status: "CLOSED", previousStatus: item.status, closedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  if (action === "HOLD") {
    if (item.status === "ON_HOLD") {
      return NextResponse.json({ error: "القضية معلّقة أصلاً" }, { status: 400 });
    }
    const updated = await prisma.case.update({
      where: { id: params.id },
      data: { previousStatus: item.status, status: "ON_HOLD" },
    });
    return NextResponse.json(updated);
  }

  if (action === "RESTORE") {
    if (item.status !== "ON_HOLD" && item.status !== "CLOSED") {
      return NextResponse.json({ error: "هذا الإجراء متاح فقط للقضايا المعلّقة أو المغلقة" }, { status: 400 });
    }
    const restoredStatus = (item.previousStatus ?? "ACTIVE") as
      | "UNDER_REVIEW"
      | "UNDER_APPROVAL"
      | "ACTIVE"
      | "ON_HOLD"
      | "CLOSED";
    const updated = await prisma.case.update({
      where: { id: params.id },
      data: { status: restoredStatus, previousStatus: null, closedAt: null },
    });
    return NextResponse.json(updated);
  }

  if (action === "SEND_BACK") {
    const prevStage = PREVIOUS_STAGE[item.status];
    if (!prevStage) {
      return NextResponse.json({ error: "لا يمكن إرجاع هذه القضية أكثر من ذلك" }, { status: 400 });
    }
    const updated = await prisma.case.update({
      where: { id: params.id },
      data: {
        status: prevStage as "UNDER_REVIEW" | "UNDER_APPROVAL" | "ACTIVE",
        previousStatus: null,
        closedAt: null,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
