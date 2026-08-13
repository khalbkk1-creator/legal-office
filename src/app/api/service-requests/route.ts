import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const requests = await prisma.serviceRequest.findMany({
    include: { client: true, quotation: true, documents: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}
