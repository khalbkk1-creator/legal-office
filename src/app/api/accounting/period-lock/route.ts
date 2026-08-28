import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const lock = await prisma.accountingPeriodLock.findFirst({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(lock);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "إقفال الفترات متاح للشريك فقط" }, { status: 403 });
  }

  const body = await req.json();
  const lockedUntil = body.lockedUntil ? new Date(body.lockedUntil) : null;

  const user = session.user as any;

  if (!lockedUntil) {
    // فك القفل بالكامل
    await prisma.accountingPeriodLock.deleteMany({});
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "DELETE",
      entityType: "AccountingPeriodLock",
      description: "ألغى إقفال الفترات المحاسبية بالكامل",
    });
    return NextResponse.json({ ok: true, lock: null });
  }

  await prisma.accountingPeriodLock.deleteMany({});
  const created = await prisma.accountingPeriodLock.create({
    data: { lockedUntil, lockedById: user.id, lockedByName: user.name },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityType: "AccountingPeriodLock",
    entityId: created.id,
    description: `أقفل الفترة المحاسبية حتى تاريخ ${lockedUntil.toLocaleDateString("ar-SA")}`,
  });

  return NextResponse.json({ ok: true, lock: created });
}
