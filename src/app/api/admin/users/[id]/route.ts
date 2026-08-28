import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requirePartner() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }) };
  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return { error: NextResponse.json({ error: "هذه الصلاحية للشركاء فقط" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePartner();
  if (guard.error) return guard.error;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name;
  if (typeof body.phone === "string") data.phone = body.phone || null;
  if (["PARTNER", "LAWYER", "SECRETARY"].includes(body.role)) data.role = body.role;
  if ("managerId" in body) data.managerId = body.managerId || null;

  if (typeof body.password === "string" && body.password.trim()) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, phone: true, managerId: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePartner();
  if (guard.error) return guard.error;

  const session = guard.session!;
  if ((session.user as any).id === params.id) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك الخاص" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
