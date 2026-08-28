import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(_req: NextRequest, { params }: { params: { accountId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const account = await prisma.account.findUnique({ where: { id: params.accountId } });
  if (!account) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  const lines = await prisma.journalEntryLine.findMany({
    where: { accountId: params.accountId, journalEntry: { status: "POSTED" } },
    include: { journalEntry: true },
    orderBy: [{ journalEntry: { date: "asc" } }, { journalEntry: { entryNumber: "asc" } }],
  });

  const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
  let running = 0;

  const rows = lines.map((l) => {
    running += isDebitNormal ? l.debit - l.credit : l.credit - l.debit;
    return {
      "التاريخ": l.journalEntry.date.toLocaleDateString("ar-SA"),
      "رقم القيد": l.journalEntry.entryNumber,
      "البيان": l.description || l.journalEntry.description,
      "مدين": l.debit,
      "دائن": l.credit,
      "الرصيد الجاري": running,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "دفتر الأستاذ");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `دفتر-أستاذ-${account.code}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
