import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("assignedToId" in body) {
    data.assignedToId = body.assignedToId || null;
    data.managerApprovedById = null;
    data.managerApprovedAt = null;
  }

  if (body.status) {
    if (body.status === "CONFIRMED") {
      const current = await prisma.consultationRequest.findUnique({
        where: { id: params.id },
        include: { assignedTo: true },
      });
      const targetAssignedId = "assignedToId" in body ? body.assignedToId : current?.assignedToId;
      const targetAssignedTo = "assignedToId" in body
        ? (targetAssignedId ? await prisma.user.findUnique({ where: { id: targetAssignedId } }) : null)
        : current?.assignedTo;

      const needsApproval = !!targetAssignedTo?.managerId;
      const alreadyApproved = "assignedToId" in body ? false : !!current?.managerApprovedById;

      if (needsApproval && !alreadyApproved) {
        return NextResponse.json(
          { error: "لازم يعتمد مدير الموظف المسؤول هذي الاستشارة قبل تأكيدها" },
          { status: 400 }
        );
      }
    }
    data.status = body.status;
  }

  const updated = await prisma.consultationRequest.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(updated);
}
