import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp, OtpPurpose } from "@/lib/portalOtp";

// طلب رمز: للتفعيل (ACTIVATE) أو الاستعادة (RESET) أو إعادة إرسال رمز الدخول (LOGIN بعد نجاح كلمة المرور)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();
  const purpose = (body.purpose || "") as OtpPurpose;
  if (!email || !["ACTIVATE", "RESET"].includes(purpose)) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  // رسالة موحّدة دائماً حتى لا نكشف وجود البريد
  const generic = { ok: true, message: "إذا كان البريد مسجّلاً لدى المكتب فسيصلك رمز التحقق." };
  const client = await prisma.client.findFirst({ where: { email } });
  if (!client || client.portalDisabled) { await new Promise((r) => setTimeout(r, 500)); return NextResponse.json(generic); }
  if (purpose === "ACTIVATE" && client.passwordHash) return NextResponse.json({ error: "هذا الحساب مفعّل مسبقاً — سجّل الدخول أو استخدم استعادة كلمة المرور." }, { status: 400 });
  if (purpose === "RESET" && !client.passwordHash) return NextResponse.json({ error: "الحساب غير مفعّل بعد — استخدم تفعيل الحساب." }, { status: 400 });

  const settings = await prisma.officeSettings.findFirst();
  const otp = await issueOtp(client, purpose, settings?.officeName || "مكتب المحاماة", body.channel);
  if (!otp.ok) return NextResponse.json({ error: otp.error }, { status: 400 });
  return NextResponse.json({ ...generic, channel: otp.channel, masked: otp.masked });
}
