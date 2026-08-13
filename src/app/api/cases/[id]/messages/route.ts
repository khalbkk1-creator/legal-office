import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });

  const created = await prisma.caseMessage.create({
    data: { caseId: params.id, fromClient: false, message },
  });

  return NextResponse.json(created, { status: 201 });
}
