import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateApiKey } from "@/lib/apiAuth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "PARTNER") return NextResponse.json({ error: "متاح للشريك فقط" }, { status: 403 });

  const keys = await prisma.apiKey.findMany({
    select: { id: true, name: true, keyPrefix: true, isActive: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "PARTNER") return NextResponse.json({ error: "متاح للشريك فقط" }, { status: 403 });

  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "اسم المفتاح مطلوب" }, { status: 400 });

  const { raw, prefix } = generateApiKey();
  const keyHash = await bcrypt.hash(raw, 10);

  const created = await prisma.apiKey.create({
    data: { name, keyHash, keyPrefix: prefix, createdById: user.id },
  });

  // المفتاح الحقيقي يُعرض هذه المرة فقط ولا يُخزّن أبداً بشكل نصي
  return NextResponse.json({ id: created.id, name: created.name, key: raw }, { status: 201 });
}
