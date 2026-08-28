import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPortalSessionCookieValue, portalCookieOptions } from "@/lib/portalAuth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const password = body.password || "";

  if (!name || !email || !phone || !password) {
    return NextResponse.json({ error: "الاسم والإيميل والجوال وكلمة المرور مطلوبة" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
  }

  const existing = await prisma.client.findFirst({
    where: { OR: [{ email }, { phone }] },
  });

  if (existing?.passwordHash) {
    return NextResponse.json({ error: "يوجد حساب مسجّل مسبقاً بهذا الإيميل أو الجوال، سجّل الدخول بدلاً من ذلك" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const client = existing
    ? await prisma.client.update({
        where: { id: existing.id },
        data: { passwordHash, name, email, phone },
      })
    : await prisma.client.create({
        data: { name, email, phone, passwordHash },
      });

  const token = await createPortalSessionCookieValue(client.id);
  const res = NextResponse.json({ id: client.id, name: client.name }, { status: 201 });
  const { name: cookieName, ...options } = portalCookieOptions();
  res.cookies.set(cookieName, token, options);
  return res;
}
