import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const account = await prisma.account.findUnique({ where: { id: params.id } });
  if (!account) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("name" in body) data.name = body.name;
  if ("isActive" in body) data.isActive = !!body.isActive;
  if (!account.isSystem) {
    if ("code" in body) data.code = body.code;
    if ("type" in body) data.type = body.type;
    if ("parentId" in body) data.parentId = body.parentId || null;
  }

  const updated = await prisma.account.update({ where: { id: params.id }, data });

  const user = session.user as any;
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityType: "Account",
    entityId: updated.id,
    description: `عدّل حساب: ${account.code} — ${account.name} ← ${updated.code} — ${updated.name}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const account = await prisma.account.findUnique({ where: { id: params.id } });
  if (!account) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  if (account.isSystem) {
    return NextResponse.json({ error: "لا يمكن حذف حساب نظامي أساسي" }, { status: 400 });
  }

  const usageCount = await prisma.journalEntryLine.count({ where: { accountId: params.id } });
  if (usageCount > 0) {
    return NextResponse.json({ error: "لا يمكن حذف حساب له حركات مرحّلة، عطّله بدلاً من الحذف" }, { status: 400 });
  }

  const childrenCount = await prisma.account.count({ where: { parentId: params.id } });
  if (childrenCount > 0) {
    return NextResponse.json({ error: "لا يمكن حذف حساب له حسابات فرعية" }, { status: 400 });
  }

  await prisma.account.delete({ where: { id: params.id } });

  const user = session.user as any;
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityType: "Account",
    entityId: params.id,
    description: `حذف حساب: ${account.code} — ${account.name}`,
  });

  return NextResponse.json({ ok: true });
}
