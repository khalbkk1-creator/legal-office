import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const hearings = await prisma.hearing.findMany({
    include: { case: { include: { client: true, lawyer: true } } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(hearings);
}
