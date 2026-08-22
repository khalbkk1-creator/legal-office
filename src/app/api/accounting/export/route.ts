import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const typeLabels: Record<string, string> = {
  ASSET: "أصول",
  LIABILITY: "التزامات",
  EQUITY: "حقوق ملكية",
  REVENUE: "إيرادات",
  EXPENSE: "مصروفات",
};

function toXlsxResponse(wb: XLSX.WorkBook, filename: string) {
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");

  if (type === "trial-balance") {
    const accounts = await prisma.account.findMany({ orderBy: { code: "asc" } });
    const lineSums = await prisma.journalEntryLine.groupBy({ by: ["accountId"], _sum: { debit: true, credit: true } });
    const sumsByAccount: Record<string, { debit: number; credit: number }> = {};
    for (const s of lineSums) sumsByAccount[s.accountId] = { debit: s._sum.debit ?? 0, credit: s._sum.credit ?? 0 };

    const rows = accounts
      .filter((a) => sumsByAccount[a.id])
      .map((a) => {
        const sums = sumsByAccount[a.id];
        const isDebitNormal = a.type === "ASSET" || a.type === "EXPENSE";
        const balance = isDebitNormal ? sums.debit - sums.credit : sums.credit - sums.debit;
        return {
          "الرقم": a.code,
          "اسم الحساب": a.name,
          "النوع": typeLabels[a.type],
          "مدين": sums.debit,
          "دائن": sums.credit,
          "الرصيد": balance,
        };
      });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ميزان المراجعة");
    return toXlsxResponse(wb, `ميزان-المراجعة-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (type === "journal") {
    const entries = await prisma.journalEntry.findMany({
      include: { lines: { include: { account: true } }, createdBy: true },
      orderBy: { date: "asc" },
    });

    const rows: Record<string, unknown>[] = [];
    for (const e of entries) {
      for (const l of e.lines) {
        rows.push({
          "رقم القيد": e.entryNumber,
          "التاريخ": e.date.toLocaleDateString("ar-SA"),
          "البيان": l.description || e.description,
          "الحساب": `${l.account.code} — ${l.account.name}`,
          "مدين": l.debit,
          "دائن": l.credit,
          "بواسطة": e.createdBy?.name ?? "",
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "القيود اليومية");
    return toXlsxResponse(wb, `القيود-اليومية-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (type === "statements") {
    const accounts = await prisma.account.findMany({ orderBy: { code: "asc" } });
    const lineSums = await prisma.journalEntryLine.groupBy({ by: ["accountId"], _sum: { debit: true, credit: true } });
    const sumsByAccount: Record<string, { debit: number; credit: number }> = {};
    for (const s of lineSums) sumsByAccount[s.accountId] = { debit: s._sum.debit ?? 0, credit: s._sum.credit ?? 0 };

    const balanceRows = accounts
      .filter((a) => sumsByAccount[a.id])
      .map((a) => {
        const sums = sumsByAccount[a.id];
        const isDebitNormal = a.type === "ASSET" || a.type === "EXPENSE";
        const balance = isDebitNormal ? sums.debit - sums.credit : sums.credit - sums.debit;
        return { ...a, balance };
      });

    const revenues = balanceRows.filter((r) => r.type === "REVENUE");
    const expenses = balanceRows.filter((r) => r.type === "EXPENSE");
    const totalRevenue = revenues.reduce((s, r) => s + r.balance, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    const incomeRows = [
      ...revenues.map((r) => ({ "البند": r.name, "المبلغ": r.balance, "القسم": "إيرادات" })),
      ...expenses.map((r) => ({ "البند": r.name, "المبلغ": r.balance, "القسم": "مصروفات" })),
      { "البند": "صافي الربح/الخسارة", "المبلغ": netIncome, "القسم": "الإجمالي" },
    ];

    const assets = balanceRows.filter((r) => r.type === "ASSET");
    const liabilities = balanceRows.filter((r) => r.type === "LIABILITY");
    const equity = balanceRows.filter((r) => r.type === "EQUITY");

    const balanceSheetRows = [
      ...assets.map((r) => ({ "البند": r.name, "المبلغ": r.balance, "القسم": "أصول" })),
      ...liabilities.map((r) => ({ "البند": r.name, "المبلغ": r.balance, "القسم": "التزامات" })),
      ...equity.map((r) => ({ "البند": r.name, "المبلغ": r.balance, "القسم": "حقوق ملكية" })),
      { "البند": "صافي ربح الفترة الحالية", "المبلغ": netIncome, "القسم": "حقوق ملكية" },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), "قائمة الدخل");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(balanceSheetRows), "الميزانية العمومية");
    return toXlsxResponse(wb, `القوائم-المالية-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return NextResponse.json({ error: "نوع التقرير غير معروف" }, { status: 400 });
}
