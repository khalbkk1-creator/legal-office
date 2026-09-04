"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OtpInput from "@/components/OtpInput";

export default function OtpPasswordFlow({ purpose, submitLabel }: { purpose: "ACTIVATE" | "RESET"; submitLabel: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [masked, setMasked] = useState("");
  const [channel, setChannel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function request(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setError(""); setInfo("");
    const res = await fetch("/api/portal-auth/otp/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, purpose }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "تعذر الإرسال");
    setMasked(d.masked || ""); setChannel(d.channel || ""); setInfo(d.message || ""); setStep(2);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
    setBusy(true); setError("");
    const res = await fetch("/api/portal-auth/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, purpose, password }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "تعذر التحقق");
    router.push(`/portal/${d.token}`);
  }

  if (step === 2) {
    return (
      <form onSubmit={verify} className="space-y-4">
        <p className="text-sm text-gray-600">{masked ? <>أرسلنا رمزاً إلى <b dir="ltr">{masked}</b> عبر {channel === "SMS" ? "رسالة نصية" : "البريد"}.</> : info}</p>
        <OtpInput value={code} onChange={setCode} disabled={busy} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="كلمة المرور الجديدة (8 أحرف، حروف وأرقام)" required minLength={8} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" />
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="تأكيد كلمة المرور" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy || code.length !== 6} className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60">{busy ? "..." : submitLabel}</button>
        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={() => request()} disabled={busy} className="text-primary-700 hover:underline">إعادة إرسال الرمز</button>
          <button type="button" onClick={() => { setStep(1); setCode(""); setError(""); }} className="text-gray-500 hover:underline">رجوع</button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={request} className="space-y-3">
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="البريد الإلكتروني المسجّل لدى المكتب" dir="ltr" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" />
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button type="submit" disabled={busy} className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60">{busy ? "..." : "إرسال رمز التحقق"}</button>
      <p className="text-[11px] text-gray-400">لا تجد بريدك؟ تواصل مع المكتب لتسجيله في ملفك.</p>
    </form>
  );
}
