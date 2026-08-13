import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entry = await prisma.timeEntry.findUnique({ where: { id: params.id } });
  if (!entry) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (entry.billed) {
    return NextResponse.json({ error: "لا يمكن حذف قيد تمت فوترته" }, { status: 400 });
  }

  await prisma.timeEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
