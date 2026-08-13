import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body.name || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim();
  const notes = (body.notes || "").trim();

  if (!name || !phone) {
    return NextResponse.json({ error: "الاسم والجوال مطلوبان" }, { status: 400 });
  }

  const accessToken = crypto.randomBytes(24).toString("base64url");

  const client = await prisma.client.create({
    data: {
      name,
      phone,
      email: email || undefined,
      notes: notes || undefined,
      accessToken,
    },
  });

  return NextResponse.json({ ok: true, portalToken: client.accessToken }, { status: 201 });
}
