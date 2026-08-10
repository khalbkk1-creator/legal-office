import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  "الهوية الوطنية",
  "السجل التجاري",
  "العنوان الوطني",
  "عقد التأسيس",
  "صحيفة الدعوى",
  "مذكرة جوابية",
  "مذكرة اعتراضية",
  "مذكرة التماس إعادة نظر",
  "مذكرة نقض",
  "تقرير",
  "إخطار",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const count = await prisma.documentCategory.count();
  if (count === 0) {
    await prisma.documentCategory.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name })),
      skipDuplicates: true,
    });
  }

  const categories = await prisma.documentCategory.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "اسم المجلد مطلوب" }, { status: 400 });

  const existing = await prisma.documentCategory.findUnique({ where: { name } });
  if (existing) return NextResponse.json(existing);

  const created = await prisma.documentCategory.create({ data: { name } });
  return NextResponse.json(created, { status: 201 });
}
