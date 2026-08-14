import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.officeSettings.findFirst();
  return NextResponse.json({
    officeName: settings?.officeName ?? null,
    logoUrl: settings?.logoUrl ?? null,
    phoneConsultationRate: settings?.phoneConsultationRate ?? null,
    inPersonConsultationRate: settings?.inPersonConsultationRate ?? null,
    writtenConsultationRate: settings?.writtenConsultationRate ?? null,
    consultationDays: settings?.consultationDays ?? [0, 1, 2, 3, 4],
    consultationStartTime: settings?.consultationStartTime ?? null,
    consultationEndTime: settings?.consultationEndTime ?? null,
  });
}
