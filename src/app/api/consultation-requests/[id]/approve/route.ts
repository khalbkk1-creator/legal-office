import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const consultation = await prisma.consultationRequest.findUnique({
    where: { id: params.id },
    include: { assignedTo: true },
  });
  if (!consultation) return NextResponse.json({ error: "الاستشارة غير موجودة" }, { status: 404 });

  const isManager = consultation.assignedTo?.managerId === userId;
  if (!isManager && role !== "PARTNER") {
    return NextResponse.json({ error: "اعتماد هذه الاستشارة متاح لمدير الموظف المسؤول أو الشريك فقط" }, { status: 403 });
  }

  const updated = await prisma.consultationRequest.update({
    where: { id: params.id },
    data: { managerApprovedById: userId, managerApprovedAt: new Date() },
  });

  return NextResponse.json(updated);
}
