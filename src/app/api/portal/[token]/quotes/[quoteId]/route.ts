import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string; quoteId: string } }
) {
  const client = await prisma.client.findUnique({ where: { accessToken: params.token } });
  if (!client) return NextResponse.json({ error: "رابط غير صالح" }, { status: 404 });

  const quote = await prisma.quotation.findUnique({ where: { id: params.quoteId } });
  if (!quote || quote.clientId !== client.id) {
    return NextResponse.json({ error: "عرض السعر غير موجود" }, { status: 404 });
  }
  if (quote.status !== "PENDING") {
    return NextResponse.json({ error: "تم الرد على هذا العرض مسبقاً" }, { status: 400 });
  }

  const body = await req.json();
  const action = body.action as string;
  if (action !== "ACCEPT" && action !== "REJECT") {
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }

  const updated = await prisma.quotation.update({
    where: { id: params.quoteId },
    data: { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" },
  });

  return NextResponse.json(updated);
}
