import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postJournalEntry } from "@/lib/accounting";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const entries = await prisma.journalEntry.findMany({
    include: { lines: { include: { account: true } }, createdBy: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const description = (body.description || "").trim();
  const lines = body.lines as { accountId: string; debit?: number; credit?: number; description?: string }[];

  if (!description || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "الوصف وسطرين على الأقل مطلوبة" }, { status: 400 });
  }

  const user = session.user as any;

  try {
    const created = await postJournalEntry({
      description,
      sourceType: "MANUAL",
      createdById: user.id,
      date: body.date ? new Date(body.date) : undefined,
      lines,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "تعذر ترحيل القيد" }, { status: 400 });
  }
}
