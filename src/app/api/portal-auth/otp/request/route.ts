import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp, OtpPurpose } from "@/lib/portalOtp";

// طلب رمز: تسجيل/تفعيل (ACTIVATE) مفتوح للجميع، أو استعادة (RESET) لحساب مفعّل
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();
  const purpose = (body.purpose || "") as OtpPurpose;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !["ACTIVATE", "RESET"].includes(purpose)) {
    return NextResponse.json({ error: "أدخل بريداً إلكترونياً صحيحاً" }, { status: 400 });
  }

  const client = await prisma.client.findFirst({ where: { email } });
  if (client?.portalDisabled) return NextResponse.json({ error: "تم تعطيل هذا الحساب. تواصل مع المكتب." }, { status: 403 });

  if (purpose === "ACTIVATE" && client?.passwordHash) {
    return NextResponse.json({ error: "هذا البريد مسجّل ومفعّل — سجّل الدخول أو استخدم استعادة كلمة المرور." }, { status: 400 });
  }
  if (purpose === "RESET") {
    // رسالة موحّدة حتى لا نكشف وجود البريد
    if (!client || !client.passwordHash) { await new Promise((r) => setTimeout(r, 500)); return NextResponse.json({ ok: true, message: "إذا كان البريد مسجّلاً فسيصلك رمز التحقق." }); }
  }

  const settings = await prisma.officeSettings.findFirst();
  const target = client ? { id: client.id, email: client.email, phone: client.phone } : { id: null, email, phone: (body.phone || "").trim() || null };
  const otp = await issueOtp(target, purpose, settings?.officeName || "مكتب المحاماة", body.channel);
  if (!otp.ok) return NextResponse.json({ error: otp.error }, { status: 400 });
  return NextResponse.json({ ok: true, channel: otp.channel, masked: otp.masked, existing: !!client });
}
