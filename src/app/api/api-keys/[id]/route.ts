import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "PARTNER") return NextResponse.json({ error: "متاح للشريك فقط" }, { status: 403 });

  await prisma.apiKey.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
