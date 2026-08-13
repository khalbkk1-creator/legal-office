import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ clients: [], cases: [], sales: [], quotes: [], documents: [] });

  const [clients, cases, sales, quotes, documents] = await Promise.all([
    prisma.client.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] },
      take: 8,
    }),
    prisma.case.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { caseNumber: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { client: true },
      take: 8,
    }),
    prisma.sale.findMany({
      where: { OR: [{ invoiceNumber: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
      include: { client: true },
      take: 8,
    }),
    prisma.quotation.findMany({
      where: { OR: [{ quoteNumber: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
      include: { client: true },
      take: 8,
    }),
    prisma.caseDocument.findMany({
      where: { fileName: { contains: q, mode: "insensitive" } },
      include: { case: true },
      take: 8,
    }),
  ]);

  return NextResponse.json({ clients, cases, sales, quotes, documents });
}
