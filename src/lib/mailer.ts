/** إرسال بريد عبر Resend (REST بدون SDK). إن لم يُضبط المفتاح يُرجع خطأً واضحاً. */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "no-reply@example.com";
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV MAIL] to=${to} subject=${subject}\n${html.replace(/<[^>]+>/g, " ")}`);
      return { ok: true, dev: true };
    }
    return { ok: false, error: "خدمة البريد غير مضبوطة (RESEND_API_KEY)" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) return { ok: false, error: `فشل إرسال البريد (${res.status})` };
  return { ok: true };
}

export function otpEmailHtml(officeName: string, code: string, purposeLabel: string) {
  return `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e3e8e6;border-radius:16px;overflow:hidden">
    <div style="background:#1f5348;color:#fff;padding:20px 24px;font-size:18px;font-weight:bold">${officeName}</div>
    <div style="padding:24px">
      <p style="color:#161b1a;font-size:15px">رمز التحقق الخاص بك لـ<b>${purposeLabel}</b>:</p>
      <div style="font-size:34px;letter-spacing:10px;font-weight:bold;color:#1f5348;text-align:center;padding:16px;background:#eef5f3;border-radius:12px;direction:ltr">${code}</div>
      <p style="color:#6b7774;font-size:13px;margin-top:16px">الرمز صالح لمدة 10 دقائق. إن لم تطلب هذا الرمز فتجاهل الرسالة.</p>
    </div>
  </div>`;
}
