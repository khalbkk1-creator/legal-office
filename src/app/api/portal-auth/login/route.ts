import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isLocked, recordFailedLogin, LOCK_MINUTES } from "@/lib/portalAuth";
import { issueOtp } from "@/lib/portalOtp";

const GENERIC = "بيانات الدخول غير صحيحة";

// الخطوة 1: بريد + كلمة مرور → إرسال رمز التحقق
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return NextResponse.json({ error: "الإيميل وكلمة المرور مطلوبة" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { email } });
  if (!client || !client.passwordHash) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }
  if (client.portalDisabled) return NextResponse.json({ error: "تم تعطيل الوصول للبوابة. تواصل مع المكتب." }, { status: 403 });
  if (isLocked(client)) {
    const mins = Math.ceil((client.lockedUntil!.getTime() - Date.now()) / 60000);
    return NextResponse.json({ error: `الحساب مقفل مؤقتاً. حاول بعد ${mins} دقيقة.` }, { status: 429 });
  }

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) {
    const locked = await recordFailedLogin(client);
    return NextResponse.json({ error: locked ? `تم قفل الحساب ${LOCK_MINUTES} دقيقة بعد محاولات متكررة.` : GENERIC }, { status: locked ? 429 : 401 });
  }

  const settings = await prisma.officeSettings.findFirst();
  const otp = await issueOtp(client, "LOGIN", settings?.officeName || "مكتب المحاماة", body.channel);
  if (!otp.ok) return NextResponse.json({ error: otp.error }, { status: 400 });
  return NextResponse.json({ otpRequired: true, channel: otp.channel, masked: otp.masked });
}
