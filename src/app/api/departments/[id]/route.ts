import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "إدارة الإدارات متاحة للشريك فقط" }, { status: 403 });
  }

  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "اسم الإدارة مطلوب" }, { status: 400 });

  const updated = await prisma.department.update({ where: { id: params.id }, data: { name } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "إدارة الإدارات متاحة للشريك فقط" }, { status: 403 });
  }

  const positionsCount = await prisma.position.count({ where: { departmentId: params.id } });
  if (positionsCount > 0) {
    return NextResponse.json(
      { error: "لا يمكن حذف إدارة مرتبطة بمسميات وظيفية، غيّر إدارتها أولاً" },
      { status: 400 }
    );
  }

  await prisma.department.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
