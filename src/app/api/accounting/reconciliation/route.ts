import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId مطلوب" }, { status: 400 });

  const [statementLines, journalLines] = await Promise.all([
    prisma.bankStatementLine.findMany({ where: { accountId }, orderBy: { date: "asc" } }),
    prisma.journalEntryLine.findMany({
      where: { accountId, journalEntry: { status: "POSTED" } },
      include: { journalEntry: true },
      orderBy: [{ journalEntry: { date: "asc" } }],
    }),
  ]);

  return NextResponse.json({ statementLines, journalLines });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const accountId = body.accountId as string;
  const lines = body.lines as { date: string; description: string; amount: number }[];

  if (!accountId || !Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  await prisma.bankStatementLine.createMany({
    data: lines.map((l) => ({
      accountId,
      date: new Date(l.date),
      description: l.description,
      amount: l.amount,
    })),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
