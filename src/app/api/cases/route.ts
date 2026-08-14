import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const caseSchema = z.object({
  caseNumber: z.string().min(1),
  title: z.string().min(1),
  caseType: z.string().min(1),
  appealCategory: z.enum(["REGULAR", "EXECUTION", "URGENT"]).default("REGULAR"),
  status: z.enum(["UNDER_REVIEW", "UNDER_APPROVAL", "ACTIVE", "ON_HOLD", "CLOSED"]).default("UNDER_REVIEW"),
  court: z.string().optional(),
  opposingParty: z.string().optional(),
  claimValue: z.number().optional(),
  description: z.string().optional(),
  clientId: z.string().min(1),
  lawyerId: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const cases = await prisma.case.findMany({
    include: { client: true, lawyer: true, _count: { select: { hearings: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cases);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = caseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.case.create({ data: parsed.data });
  return NextResponse.json(created, { status: 201 });
}
