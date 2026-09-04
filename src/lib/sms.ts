/** إرسال SMS عبر Twilio أو Unifonic حسب SMS_PROVIDER. */
export function smsConfigured() {
  const p = process.env.SMS_PROVIDER;
  if (p === "twilio") return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
  if (p === "unifonic") return !!(process.env.UNIFONIC_APP_SID && process.env.UNIFONIC_SENDER_ID);
  return false;
}

function normalizePhone(phone: string) {
  let p = phone.replace(/[\s-]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("05")) p = "+966" + p.slice(1);
  if (p.startsWith("5") && p.length === 9) p = "+966" + p;
  if (!p.startsWith("+")) p = "+" + p;
  return p;
}

export async function sendSms(to: string, body: string) {
  const provider = process.env.SMS_PROVIDER;
  const phone = normalizePhone(to);
  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: phone, From: process.env.TWILIO_FROM!, Body: body }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Twilio ${res.status}` };
  }
  if (provider === "unifonic") {
    const res = await fetch("https://el.cloud.unifonic.com/rest/SMS/messages", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ AppSid: process.env.UNIFONIC_APP_SID!, SenderID: process.env.UNIFONIC_SENDER_ID!, Recipient: phone.replace("+", ""), Body: body }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Unifonic ${res.status}` };
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV SMS] to=${phone}: ${body}`);
    return { ok: true, dev: true };
  }
  return { ok: false, error: "خدمة الرسائل غير مضبوطة" };
}
