import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string; caseId: string } }
) {
  const client = await prisma.client.findUnique({ where: { accessToken: params.token } });
  if (!client) return NextResponse.json({ error: "رابط غير صالح" }, { status: 404 });

  const caseItem = await prisma.case.findUnique({ where: { id: params.caseId } });
  if (!caseItem || caseItem.clientId !== client.id) {
    return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });
  }

  const body = await req.json();
  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });

  const created = await prisma.caseMessage.create({
    data: { caseId: params.caseId, fromClient: true, message },
  });

  return NextResponse.json(created, { status: 201 });
}
