import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreatePayeeAccount } from "@/lib/accounting";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const payees = await prisma.payee.findMany({
    include: { account: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(payees);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const name = (body.name || "").trim();
  const type = body.type === "COMPANY" ? "COMPANY" : "INDIVIDUAL";
  const phone = (body.phone || "").trim() || undefined;
  const notes = (body.notes || "").trim() || undefined;

  if (!name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });

  const accountId = await getOrCreatePayeeAccount(name);

  const created = await prisma.payee.create({
    data: { name, type, phone, notes, accountId },
    include: { account: true },
  });

  return NextResponse.json(created, { status: 201 });
}
