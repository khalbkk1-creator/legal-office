import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entries = await prisma.timeEntry.findMany({
    where: { caseId: params.id },
    include: { lawyer: true },
    orderBy: { entryDate: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const description = (body.description || "").trim();
  const minutes = Number(body.minutes);
  const hourlyRate = Number(body.hourlyRate);

  if (!description || !minutes || minutes <= 0 || !hourlyRate || hourlyRate <= 0) {
    return NextResponse.json({ error: "الوصف والمدة والسعر مطلوبة" }, { status: 400 });
  }

  const user = session.user as any;

  const entry = await prisma.timeEntry.create({
    data: {
      caseId: params.id,
      lawyerId: user.id,
      description,
      minutes,
      hourlyRate,
      entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
    },
    include: { lawyer: true },
  });

  return NextResponse.json(entry, { status: 201 });
}
