"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OtpInput from "@/components/OtpInput";

export default function LoginFlow({ next }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [masked, setMasked] = useState("");
  const [channel, setChannel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function step1(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/portal-auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "تعذر الدخول");
    setMasked(d.masked); setChannel(d.channel); setStep(2);
  }

  async function step2(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/portal-auth/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, purpose: "LOGIN" }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "الرمز غير صحيح");
    router.push(next && next.startsWith("/portal/") ? next : `/portal/${d.token}`);
  }

  async function resend() {
    setBusy(true); setError("");
    const res = await fetch("/api/portal-auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "تعذر إعادة الإرسال");
    setCode("");
  }

  if (step === 2) {
    return (
      <form onSubmit={step2} className="space-y-4">
        <p className="text-sm text-gray-600">أرسلنا رمزاً من 6 أرقام إلى <b dir="ltr">{masked}</b> عبر {channel === "SMS" ? "رسالة نصية" : "البريد الإلكتروني"}.</p>
        <OtpInput value={code} onChange={setCode} disabled={busy} />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy || code.length !== 6} className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60">{busy ? "جاري التحقق..." : "تأكيد الدخول"}</button>
        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={resend} disabled={busy} className="text-primary-700 hover:underline">إعادة إرسال الرمز</button>
          <button type="button" onClick={() => { setStep(1); setCode(""); setError(""); }} className="text-gray-500 hover:underline">رجوع</button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={step1} className="space-y-3">
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="البريد الإلكتروني" dir="ltr" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="كلمة المرور" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" />
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button type="submit" disabled={busy} className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60">{busy ? "..." : "متابعة"}</button>
      <div className="flex items-center justify-between text-xs pt-1">
        <Link href="/portal/register" className="text-primary-700 hover:underline">ليس لديك حساب؟ سجّل الآن</Link>
        <Link href="/portal/forgot" className="text-gray-500 hover:underline">نسيت كلمة المرور</Link>
      </div>
    </form>
  );
}
