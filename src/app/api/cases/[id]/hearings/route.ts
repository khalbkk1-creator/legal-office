import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const hearing = await prisma.hearing.create({
    data: {
      caseId: params.id,
      date: new Date(body.date),
      court: body.court || undefined,
      roundNumber: body.roundNumber ? Number(body.roundNumber) : undefined,
      notes: body.notes || undefined,
    },
  });

  if (body.appealDeadline) {
    await prisma.case.update({
      where: { id: params.id },
      data: { appealDeadline: new Date(body.appealDeadline) },
    });
  }

  return NextResponse.json(hearing, { status: 201 });
}
