import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const authorized = await verifyApiKey(req);
  if (!authorized) return NextResponse.json({ error: "مفتاح API غير صحيح أو غير مفعّل" }, { status: 401 });

  const cases = await prisma.case.findMany({
    select: {
      id: true,
      caseNumber: true,
      title: true,
      caseType: true,
      status: true,
      court: true,
      opposingParty: true,
      claimValue: true,
      appealDeadline: true,
      openedAt: true,
      closedAt: true,
      client: { select: { id: true, name: true, phone: true, email: true } },
      lawyer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ data: cases });
}
