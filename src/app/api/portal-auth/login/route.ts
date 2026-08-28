import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPortalSessionCookieValue, portalCookieOptions } from "@/lib/portalAuth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "الإيميل وكلمة المرور مطلوبة" }, { status: 400 });
  }

  const client = await prisma.client.findFirst({ where: { email } });
  if (!client || !client.passwordHash) {
    return NextResponse.json({ error: "لا يوجد حساب بهذا الإيميل، سجّل حساب جديد أولاً" }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 400 });
  }

  const token = await createPortalSessionCookieValue(client.id);
  const res = NextResponse.json({ id: client.id, name: client.name });
  const { name: cookieName, ...options } = portalCookieOptions();
  res.cookies.set(cookieName, token, options);
  return res;
}
