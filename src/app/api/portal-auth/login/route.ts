import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  createPortalSessionCookieValue, portalCookieOptions, ensureClientAccessToken,
  isLocked, recordFailedLogin, recordSuccessfulLogin, LOCK_MINUTES,
} from "@/lib/portalAuth";

const GENERIC = "بيانات الدخول غير صحيحة";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return NextResponse.json({ error: "الإيميل وكلمة المرور مطلوبة" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { email } });

  // رسالة موحّدة: لا نكشف هل الإيميل موجود أم لا
  if (!client || !client.passwordHash) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }
  if (client.portalDisabled) return NextResponse.json({ error: "تم تعطيل الوصول للبوابة. تواصل مع المكتب." }, { status: 403 });
  if (isLocked(client)) {
    const mins = Math.ceil((client.lockedUntil!.getTime() - Date.now()) / 60000);
    return NextResponse.json({ error: `الحساب مقفل مؤقتاً بسبب محاولات متكررة. حاول بعد ${mins} دقيقة.` }, { status: 429 });
  }

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) {
    const locked = await recordFailedLogin(client);
    return NextResponse.json({ error: locked ? `تم قفل الحساب ${LOCK_MINUTES} دقيقة بعد محاولات متكررة.` : GENERIC }, { status: locked ? 429 : 401 });
  }

  await recordSuccessfulLogin(client.id);
  const accessToken = await ensureClientAccessToken(client.id, client.accessToken, client.accessTokenExpiresAt);
  const sessionToken = await createPortalSessionCookieValue(client.id);
  const res = NextResponse.json({ id: client.id, name: client.name, token: accessToken });
  const { name: cookieName, ...options } = portalCookieOptions();
  res.cookies.set(cookieName, sessionToken, options);
  return res;
}
