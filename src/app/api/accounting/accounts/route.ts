import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureChartOfAccounts } from "@/lib/accounting";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  await ensureChartOfAccounts();
  const accounts = await prisma.account.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const code = (body.code || "").trim();
  const name = (body.name || "").trim();
  const type = body.type;
  if (!code || !name || !type) {
    return NextResponse.json({ error: "رقم الحساب والاسم والنوع مطلوبة" }, { status: 400 });
  }

  const created = await prisma.account.create({
    data: { code, name, type, parentId: body.parentId || undefined },
  });
  return NextResponse.json(created, { status: 201 });
}
