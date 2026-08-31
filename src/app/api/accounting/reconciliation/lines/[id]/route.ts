import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingPermission, accountingPermissionError } from "@/lib/accountingPermissions";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const allowed = await hasAccountingPermission(user.id, user.role, "reconciliationManage");
  if (!allowed) {
    return NextResponse.json({ error: accountingPermissionError("reconciliationManage") }, { status: 403 });
  }

  await prisma.bankStatementLine.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
