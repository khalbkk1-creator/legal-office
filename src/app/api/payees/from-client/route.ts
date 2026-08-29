import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreatePayeeAccount } from "@/lib/accounting";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const clientId = body.clientId as string;
  if (!clientId) return NextResponse.json({ error: "العميل مطلوب" }, { status: 400 });

  const existing = await prisma.payee.findUnique({ where: { clientId }, include: { account: true } });
  if (existing) return NextResponse.json(existing);

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

  const accountId = await getOrCreatePayeeAccount(client.name);

  const created = await prisma.payee.create({
    data: {
      name: client.name,
      type: client.type === "COMPANY" ? "COMPANY" : "INDIVIDUAL",
      phone: client.phone,
      notes: "مرتبط بعميل من قاعدة العملاء",
      accountId,
      clientId: client.id,
    },
    include: { account: true },
  });

  return NextResponse.json(created, { status: 201 });
}
