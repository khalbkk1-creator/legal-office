import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const positions = await prisma.position.findMany({
    include: { users: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(positions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "إدارة المسميات الوظيفية متاحة للشريك فقط" }, { status: 403 });
  }

  const body = await req.json();
  const name = (body.name || "").trim();
  const allowedModules = Array.isArray(body.allowedModules) ? body.allowedModules : [];
  const isAccountant = !!body.isAccountant;
  const isFinancialManager = !!body.isFinancialManager;

  if (!name) return NextResponse.json({ error: "اسم المسمى الوظيفي مطلوب" }, { status: 400 });

  const created = await prisma.position.create({
    data: { name, allowedModules, isAccountant, isFinancialManager },
  });

  return NextResponse.json(created, { status: 201 });
}
