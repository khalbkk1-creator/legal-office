import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const request = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    include: { client: true, quotation: true, documents: { include: { category: true } } },
  });
  if (!request) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(request);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("requestedCategoryIds" in body) {
    data.requestedCategoryIds = body.requestedCategoryIds;
    data.status = "DOCS_REQUESTED";
  }
  if ("status" in body) data.status = body.status;

  const updated = await prisma.serviceRequest.update({
    where: { id: params.id },
    data,
    include: { client: true, quotation: true, documents: { include: { category: true } } },
  });
  return NextResponse.json(updated);
}
