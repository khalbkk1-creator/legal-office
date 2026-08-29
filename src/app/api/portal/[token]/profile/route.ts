import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const client = await prisma.client.findUnique({ where: { accessToken: params.token } });
  if (!client) return NextResponse.json({ error: "الرابط غير صالح" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (["INDIVIDUAL", "COMPANY", "GOVERNMENT"].includes(body.type)) data.type = body.type;
  if (typeof body.idNumber === "string") data.idNumber = body.idNumber.trim() || null;
  if (typeof body.phone === "string" && body.phone.trim()) data.phone = body.phone.trim();
  if (typeof body.email === "string" && body.email.trim()) data.email = body.email.trim().toLowerCase();
  if (typeof body.address === "string") data.address = body.address.trim() || null;

  const updated = await prisma.client.update({ where: { id: client.id }, data });
  return NextResponse.json(updated);
}
