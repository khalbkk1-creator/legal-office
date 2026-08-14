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
  if ("defaultHourlyRate" in body) {
    data.defaultHourlyRate = body.defaultHourlyRate ? Number(body.defaultHourlyRate) : null;
  }
  if ("phoneConsultationRate" in body) {
    data.phoneConsultationRate = body.phoneConsultationRate ? Number(body.phoneConsultationRate) : null;
  }
  if ("inPersonConsultationRate" in body) {
    data.inPersonConsultationRate = body.inPersonConsultationRate ? Number(body.inPersonConsultationRate) : null;
  }
  if ("writtenConsultationRate" in body) {
    data.writtenConsultationRate = body.writtenConsultationRate ? Number(body.writtenConsultationRate) : null;
  }
  if ("consultationDays" in body) data.consultationDays = body.consultationDays;
  if ("consultationStartTime" in body) data.consultationStartTime = body.consultationStartTime || null;
  if ("consultationEndTime" in body) data.consultationEndTime = body.consultationEndTime || null;

  const updated = await prisma.officeSettings.update({
    where: { id: settings.id },
    data,
  });
  return NextResponse.json(updated);
}
