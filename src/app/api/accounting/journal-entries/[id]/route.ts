import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entry = await prisma.journalEntry.findUnique({
    where: { id: params.id },
    include: { reversedBy: true },
  });
  if (!entry) return NextResponse.json({ error: "القيد غير موجود" }, { status: 404 });

  // لو فيه قيد عكسي يشير لهذا القيد، نفك الربط أولاً حتى ما يبقى مرجع معلّق
  if (entry.reversedBy) {
    await prisma.journalEntry.update({
      where: { id: entry.reversedBy.id },
      data: { reversalOfId: null },
    });
  }

  await prisma.journalEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
