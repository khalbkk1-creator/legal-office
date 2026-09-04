import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, otpEmailHtml } from "@/lib/mailer";
import { sendSms, smsConfigured } from "@/lib/sms";
import { logPortalAccess } from "@/lib/portalAuth";

export const OTP_TTL_MIN = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_REQUESTS_15MIN = 3;

export type OtpPurpose = "LOGIN" | "ACTIVATE" | "RESET";
const PURPOSE_LABEL: Record<OtpPurpose, string> = { LOGIN: "تسجيل الدخول", ACTIVATE: "تفعيل حسابك", RESET: "استعادة كلمة المرور" };

function hash(code: string, email: string) {
  return crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET || "otp").update(`${email}:${code}`).digest("hex");
}

export function pickChannel(client: { email: string | null; phone: string | null }, requested?: string): "EMAIL" | "SMS" | null {
  const pref = requested || process.env.PORTAL_OTP_CHANNEL || "auto";
  if (pref === "sms" || pref === "SMS") return client.phone && smsConfigured() ? "SMS" : client.email ? "EMAIL" : null;
  if (pref === "email" || pref === "EMAIL") return client.email ? "EMAIL" : null;
  if (client.phone && smsConfigured()) return "SMS";
  if (client.email) return "EMAIL";
  return null;
}

export async function issueOtp(client: { id: string | null; email: string | null; phone: string | null }, purpose: OtpPurpose, officeName: string, requestedChannel?: string) {
  const email = (client.email || "").toLowerCase();
  const since = new Date(Date.now() - 15 * 60000);
  const recent = await prisma.portalOtp.count({ where: { email, purpose, createdAt: { gte: since } } });
  if (recent >= OTP_MAX_REQUESTS_15MIN) return { ok: false as const, error: "طلبات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً." };

  const channel = pickChannel(client, requestedChannel);
  if (!channel) return { ok: false as const, error: "لا توجد وسيلة تواصل صالحة لهذا الحساب. تواصل مع المكتب." };

  const code = String(crypto.randomInt(100000, 1000000));
  await prisma.portalOtp.updateMany({ where: { email, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.portalOtp.create({ data: { clientId: client.id, email, purpose, channel, codeHash: hash(code, email), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60000) } });

  const label = PURPOSE_LABEL[purpose];
  const sent = channel === "EMAIL"
    ? await sendEmail(client.email!, `${officeName} — رمز ${label}`, otpEmailHtml(officeName, code, label))
    : await sendSms(client.phone!, `${officeName}: رمز ${label} هو ${code} — صالح ${OTP_TTL_MIN} دقائق.`);
  if (!sent.ok) return { ok: false as const, error: sent.error || "تعذر إرسال الرمز" };

  if (client.id) await logPortalAccess(client.id, "OTP_SENT", { detail: `${label} عبر ${channel === "EMAIL" ? "البريد" : "SMS"}` });
  const masked = channel === "EMAIL" ? maskEmail(client.email!) : maskPhone(client.phone!);
  return { ok: true as const, channel, masked };
}

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string, clientId?: string | null) {
  const otp = await prisma.portalOtp.findFirst({ where: { email: email.toLowerCase(), purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!otp) return { ok: false, error: "لا يوجد رمز نشط. اطلب رمزاً جديداً." };
  if (otp.expiresAt < new Date()) return { ok: false, error: "انتهت صلاحية الرمز. اطلب رمزاً جديداً." };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "تجاوزت عدد المحاولات. اطلب رمزاً جديداً." };
  if (otp.codeHash !== hash(code.trim(), email.toLowerCase())) {
    await prisma.portalOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    if (clientId) await logPortalAccess(clientId, "OTP_FAILED", { detail: `محاولة ${otp.attempts + 1}` });
    return { ok: false, error: `الرمز غير صحيح (${OTP_MAX_ATTEMPTS - otp.attempts - 1} محاولات متبقية)` };
  }
  await prisma.portalOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}

function maskEmail(e: string) { const [u, d] = e.split("@"); return `${u.slice(0, 2)}***@${d}`; }
function maskPhone(p: string) { return `***${p.slice(-4)}`; }
