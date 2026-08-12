import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.officeSettings.findFirst();
  return NextResponse.json({
    officeName: settings?.officeName ?? null,
    logoUrl: settings?.logoUrl ?? null,
  });
}
