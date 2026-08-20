import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upgradeChartHierarchy } from "@/lib/accounting";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "إعادة التعيين متاحة للشريك فقط" }, { status: 403 });
  }

  // حذف كل القيود اليومية (يحذف سطورها تلقائياً بالتتابع)، ثم كل الحسابات
  await prisma.journalEntry.deleteMany({});
  await prisma.account.deleteMany({});

  // إعادة بناء الدليل النظيف الكامل بـ3 مستويات
  await upgradeChartHierarchy();

  return NextResponse.json({ ok: true });
}
