import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOrCreateSettings() {
  const existing = await prisma.officeSettings.findFirst();
  if (existing) return existing;
  return prisma.officeSettings.create({ data: {} });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const settings = await getOrCreateSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "تعديل الإعدادات متاح للشريك فقط" }, { status: 403 });
  }

  const settings = await getOrCreateSettings();
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("officeName" in body) data.officeName = body.officeName || null;
  if ("taxNumber" in body) data.taxNumber = body.taxNumber || null;
  if ("phone" in body) data.phone = body.phone || null;
  if ("address" in body) data.address = body.address || null;

  const updated = await prisma.officeSettings.update({
    where: { id: settings.id },
    data,
  });
  return NextResponse.json(updated);
}
