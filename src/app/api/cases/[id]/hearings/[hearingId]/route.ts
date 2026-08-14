import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; hearingId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.date) data.date = new Date(body.date);
  if ("court" in body) data.court = body.court || null;
  if ("roundNumber" in body) data.roundNumber = body.roundNumber ? Number(body.roundNumber) : null;
  if ("notes" in body) data.notes = body.notes || null;
  if ("outcome" in body) data.outcome = body.outcome || null;
  if ("isFinalRuling" in body) data.isFinalRuling = !!body.isFinalRuling;

  const updated = await prisma.hearing.update({
    where: { id: params.hearingId },
    data,
  });

  if (data.isFinalRuling === true) {
    const caseItem = await prisma.case.findUnique({ where: { id: params.id } });
    if (caseItem) {
      const days = caseItem.appealCategory === "EXECUTION" || caseItem.appealCategory === "URGENT" ? 10 : 30;
      const deadline = new Date(updated.date);
      deadline.setDate(deadline.getDate() + days);
      await prisma.case.update({
        where: { id: params.id },
        data: { appealDeadline: deadline },
      });
    }
  }

  return NextResponse.json(updated);
}
