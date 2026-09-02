import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logPaymentActivity } from "@/lib/paymentActivity";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json().catch(() => ({}));
  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "اكتب رسالة أولاً" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "الرسالة طويلة جداً" }, { status: 400 });

  const request = await prisma.paymentRequest.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  await logPaymentActivity({ requestId: params.id, userId: user.id, userName: user.name, action: "COMMENT", note: message });
  return NextResponse.json({ ok: true }, { status: 201 });
}
