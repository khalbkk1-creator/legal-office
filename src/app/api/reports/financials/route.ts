import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Bucket = { opening: number; debit: number; credit: number };

async function periodData(from: Date, to: Date) {
  const [opening, movement] = await Promise.all([
    prisma.journalEntryLine.groupBy({
      by: ["accountId"],
      where: { journalEntry: { status: "POSTED", date: { lt: from } } },
      _sum: { debit: true, credit: true },
    }),
    prisma.journalEntryLine.groupBy({
      by: ["accountId"],
      where: { journalEntry: { status: "POSTED", date: { gte: from, lte: to } } },
      _sum: { debit: true, credit: true },
    }),
  ]);
  const map: Record<string, Bucket> = {};
  for (const o of opening) {
    map[o.accountId] = { opening: (o._sum.debit ?? 0) - (o._sum.credit ?? 0), debit: 0, credit: 0 };
  }
  for (const m of movement) {
    if (!map[m.accountId]) map[m.accountId] = { opening: 0, debit: 0, credit: 0 };
    map[m.accountId].debit = m._sum.debit ?? 0;
    map[m.accountId].credit = m._sum.credit ?? 0;
  }
  return map;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const from = searchParams.get("from") ? new Date(searchParams.get("from") + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = searchParams.get("to") ? new Date(searchParams.get("to") + "T23:59:59") : now;

  // فترة المقارنة: نفس الطول مباشرة قبل الفترة الحالية
  const span = to.getTime() - from.getTime();
  const cmpTo = new Date(from.getTime() - 1);
  const cmpFrom = new Date(cmpTo.getTime() - span);

  const [accounts, curr, prev] = await Promise.all([
    prisma.account.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true, type: true, parentId: true } }),
    periodData(from, to),
    periodData(cmpFrom, cmpTo),
  ]);

  const rows = accounts.map((a) => {
    const c = curr[a.id] ?? { opening: 0, debit: 0, credit: 0 };
    const p = prev[a.id] ?? { opening: 0, debit: 0, credit: 0 };
    const signed = (b: Bucket) => (a.type === "REVENUE" || a.type === "LIABILITY" || a.type === "EQUITY" ? b.credit - b.debit : b.debit - b.credit);
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      parentId: a.parentId,
      opening: c.opening,
      debit: c.debit,
      credit: c.credit,
      closing: c.opening + c.debit - c.credit,
      periodValue: signed(c),
      prevValue: signed(p),
    };
  });

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    cmpFrom: cmpFrom.toISOString(),
    cmpTo: cmpTo.toISOString(),
    rows,
  });
}
