import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  "إيجار",
  "رواتب",
  "رسوم محكمة",
  "مواصلات",
  "طباعة وقرطاسية",
  "استشارات خارجية",
  "فواتير وخدمات",
  "أخرى",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const count = await prisma.expenseCategory.count();
  if (count === 0) {
    await prisma.expenseCategory.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name })),
      skipDuplicates: true,
    });
  }

  const categories = await prisma.expenseCategory.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "اسم التصنيف مطلوب" }, { status: 400 });

  const existing = await prisma.expenseCategory.findUnique({ where: { name } });
  if (existing) return NextResponse.json(existing);

  const created = await prisma.expenseCategory.create({ data: { name } });
  return NextResponse.json(created, { status: 201 });
}
