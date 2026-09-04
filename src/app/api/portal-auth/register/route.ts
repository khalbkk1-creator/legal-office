import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPortalSessionCookieValue, portalCookieOptions, ensureClientAccessToken, logPortalAccess, MIN_PASSWORD_LENGTH } from "@/lib/portalAuth";

/**
 * التسجيل الآمن:
 * - مع رابط دعوة (inviteToken) من المكتب → تفعيل حساب العميل الموجود.
 * - بدون رابط → إنشاء عميل جديد فقط إذا لم يكن الإيميل/الجوال مسجّلاً لدى المكتب.
 * لا يُربط التسجيل أبداً بسجل موجود بدون رابط دعوة (سدّ ثغرة الاستيلاء على الحساب).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const password = body.password || "";
  const inviteToken = (body.inviteToken || "").trim();

  if (!name || !email || !phone || !password) return NextResponse.json({ error: "الاسم والإيميل والجوال وكلمة المرور مطلوبة" }, { status: 400 });
  if (password.length < MIN_PASSWORD_LENGTH) return NextResponse.json({ error: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل` }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);

  // 1) تفعيل عبر رابط دعوة
  if (inviteToken) {
    const invited = await prisma.client.findUnique({ where: { accessToken: inviteToken } });
    if (!invited || invited.portalDisabled || (invited.accessTokenExpiresAt && invited.accessTokenExpiresAt < new Date())) {
      return NextResponse.json({ error: "رابط الدعوة غير صالح أو منتهي. اطلب رابطاً جديداً من المكتب." }, { status: 400 });
    }
    if (invited.passwordHash) return NextResponse.json({ error: "هذا الحساب مفعّل مسبقاً، سجّل الدخول." }, { status: 400 });

    const emailTaken = await prisma.client.findFirst({ where: { email, id: { not: invited.id } } });
    if (emailTaken) return NextResponse.json({ error: "هذا الإيميل مستخدم لحساب آخر." }, { status: 400 });

    const client = await prisma.client.update({
      where: { id: invited.id },
      data: { passwordHash, email, phone: invited.phone || phone, name: invited.name || name, lastPortalLoginAt: new Date() },
    });
    await logPortalAccess(client.id, "REGISTER", { detail: "تفعيل عبر رابط دعوة" });
    return withSession(client, 201);
  }

  // 2) تسجيل ذاتي بدون دعوة: يُرفض لو البيانات مسجّلة لدى المكتب
  const existing = await prisma.client.findFirst({ where: { OR: [{ email }, { phone }] } });
  if (existing) {
    return NextResponse.json(
      { error: existing.passwordHash ? "يوجد حساب بهذه البيانات، سجّل الدخول." : "بياناتك مسجّلة لدى المكتب. اطلب رابط تفعيل البوابة من المكتب." },
      { status: 400 }
    );
  }

  const client = await prisma.client.create({ data: { name, email, phone, passwordHash, lastPortalLoginAt: new Date() } });
  await logPortalAccess(client.id, "REGISTER", { detail: "تسجيل ذاتي جديد" });
  return withSession(client, 201);
}

async function withSession(client: { id: string; name: string; accessToken: string | null; accessTokenExpiresAt: Date | null }, status: number) {
  const accessToken = await ensureClientAccessToken(client.id, client.accessToken, client.accessTokenExpiresAt);
  const sessionToken = await createPortalSessionCookieValue(client.id);
  const res = NextResponse.json({ id: client.id, name: client.name, token: accessToken }, { status });
  const { name: cookieName, ...options } = portalCookieOptions();
  res.cookies.set(cookieName, sessionToken, options);
  return res;
}
