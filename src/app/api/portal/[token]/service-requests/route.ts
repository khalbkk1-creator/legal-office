import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const client = await prisma.client.findUnique({ where: { accessToken: params.token } });
  if (!client) return NextResponse.json({ error: "رابط غير صالح" }, { status: 404 });

  const body = await req.json();
  const requestType = body.requestType === "CASE" ? "CASE" : "CONSULTATION";
  const notes = (body.notes || "").trim();

  if (!notes) {
    return NextResponse.json({ error: "شرح تفاصيل الطلب مطلوب" }, { status: 400 });
  }

  const created = await prisma.serviceRequest.create({
    data: {
      clientId: client.id,
      requestType,
      notes,
      consultationType: requestType === "CONSULTATION" ? body.consultationType || undefined : undefined,
      requestedDate: body.requestedDate ? new Date(body.requestedDate) : undefined,
      durationMinutes: body.durationMinutes ? Number(body.durationMinutes) : undefined,
      estimatedCost: body.estimatedCost ? Number(body.estimatedCost) : undefined,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
