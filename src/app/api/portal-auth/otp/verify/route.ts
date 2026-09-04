import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPortalSessionCookieValue, portalCookieOptions, ensureClientAccessToken, recordSuccessfulLogin, logPortalAccess, MIN_PASSWORD_LENGTH } from "@/lib/portalAuth";
import { verifyOtp, OtpPurpose } from "@/lib/portalOtp";

// الخطوة 2: التحقق من الرمز → إنشاء الجلسة (وللتفعيل/الاستعادة: ضبط كلمة المرور)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  const purpose = (body.purpose || "LOGIN") as OtpPurpose;
  if (!email || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "أدخل الرمز المكوّن من 6 أرقام" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { email } });
  if (!client || client.portalDisabled) return NextResponse.json({ error: "الرمز غير صحيح" }, { status: 400 });

  const v = await verifyOtp(client.id, purpose, code);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const data: Record<string, unknown> = { emailVerifiedAt: new Date() };
  if (purpose === "ACTIVATE" || purpose === "RESET") {
    const password = body.password || "";
    if (password.length < MIN_PASSWORD_LENGTH || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: `كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل وتحتوي حروفاً وأرقاماً` }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(password, 10);
    if (purpose === "ACTIVATE" && typeof body.name === "string" && body.name.trim() && !client.name) data.name = body.name.trim();
  }
  await prisma.client.update({ where: { id: client.id }, data });
  await logPortalAccess(client.id, purpose === "LOGIN" ? "OTP_VERIFIED" : purpose === "ACTIVATE" ? "ACTIVATED" : "PASSWORD_RESET");
  await recordSuccessfulLogin(client.id);

  const accessToken = await ensureClientAccessToken(client.id, client.accessToken, client.accessTokenExpiresAt);
  const sessionToken = await createPortalSessionCookieValue(client.id);
  const res = NextResponse.json({ ok: true, id: client.id, name: client.name, token: accessToken });
  const { name: cookieName, ...options } = portalCookieOptions();
  res.cookies.set(cookieName, sessionToken, options);
  return res;
}
