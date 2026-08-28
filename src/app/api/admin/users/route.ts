import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

async function requirePartner() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }) };
  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return { error: NextResponse.json({ error: "هذه الصلاحية للشركاء فقط" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const guard = await requirePartner();
  if (guard.error) return guard.error;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true, managerId: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["PARTNER", "LAWYER", "SECRETARY"]),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requirePartner();
  if (guard.error) return guard.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      phone: parsed.data.phone || undefined,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(created, { status: 201 });
}
