import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePortalClientByToken } from "@/lib/portalAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string; requestId: string } }
) {
  const client = await resolvePortalClientByToken(params.token);
  if (!client) return NextResponse.json({ error: "رابط غير صالح" }, { status: 404 });

  const request = await prisma.serviceRequest.findUnique({ where: { id: params.requestId } });
  if (!request || request.clientId !== client.id) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const body = await req.json();
  const reply = (body.reply || "").trim();
  if (!reply) return NextResponse.json({ error: "الرد فارغ" }, { status: 400 });

  const updated = await prisma.serviceRequest.update({
    where: { id: params.requestId },
    data: { clientReply: reply, status: "DOCS_SUBMITTED" },
  });

  return NextResponse.json(updated);
}
