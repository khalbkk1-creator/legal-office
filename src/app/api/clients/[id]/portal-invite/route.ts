import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { sendSms, smsConfigured } from "@/lib/sms";
import { logPortalAccess } from "@/lib/portalAuth";

// يرسل للعميل دعوة لتفعيل حسابه ببوابة العملاء (بريد أو SMS) — بدون أي رابط سري
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const channel = body.channel === "sms" ? "SMS" : "EMAIL";
  if (channel === "EMAIL" && !client.email) return NextResponse.json({ error: "لا يوجد بريد إلكتروني مسجّل لهذا العميل" }, { status: 400 });
  if (channel === "SMS" && (!client.phone || !smsConfigured())) return NextResponse.json({ error: "الرسائل النصية غير متاحة أو لا يوجد جوال" }, { status: 400 });

  const settings = await prisma.officeSettings.findFirst();
  const officeName = settings?.officeName || "مكتب المحاماة";
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const portalUrl = `${origin}/portal/${client.passwordHash ? "login" : "register"}`;

  const sent = channel === "EMAIL"
    ? await sendEmail(client.email!, `${officeName} — بوابة العملاء`, `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e3e8e6;border-radius:16px;overflow:hidden">
        <div style="background:#1f5348;color:#fff;padding:20px 24px;font-size:18px;font-weight:bold">${officeName}</div>
        <div style="padding:24px;color:#161b1a;font-size:15px;line-height:1.8">
          <p>مرحباً ${client.name}،</p>
          <p>يمكنك متابعة قضاياك ومستنداتك والتواصل معنا عبر بوابة العملاء.</p>
          <p style="text-align:center;margin:24px 0"><a href="${portalUrl}" style="background:#1f5348;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold">${client.passwordHash ? "تسجيل الدخول" : "تفعيل حسابي"}</a></p>
          <p style="font-size:13px;color:#6b7774">${client.passwordHash ? "ادخل ببريدك وكلمة مرورك ثم رمز التحقق." : "أدخل هذا البريد وسيصلك رمز تحقق لتعيين كلمة مرورك."}</p>
        </div>
      </div>`)
    : await sendSms(client.phone!, `${officeName}: فعّل حسابك ببوابة العملاء عبر ${portalUrl} باستخدام بريدك ${client.email ?? ""}`);

  if (!sent.ok) return NextResponse.json({ error: sent.error || "تعذر الإرسال" }, { status: 400 });
  await logPortalAccess(client.id, "INVITE_SENT", { detail: `عبر ${channel === "EMAIL" ? "البريد" : "SMS"} بواسطة ${(session.user as any)?.name ?? ""}` });
  return NextResponse.json({ ok: true, portalUrl });
}
