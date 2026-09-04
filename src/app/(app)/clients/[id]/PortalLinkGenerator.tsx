"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// لوحة دعوة العميل للبوابة الموحّدة (رابط واحد للجميع + تحقق بالرمز)
export default function PortalLinkGenerator({ clientId, existingToken, clientPhone }: { clientId: string; existingToken: string | null; clientPhone: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";

  async function invite(channel: "email" | "sms") {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/clients/${clientId}/portal-invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: d.error || "تعذر الإرسال" });
    setMsg({ ok: true, text: channel === "email" ? "أُرسلت الدعوة إلى بريد العميل" : "أُرسلت الدعوة برسالة نصية" });
    router.refresh();
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-ink">دعوة العميل للبوابة</h2>
      <p className="text-xs text-gray-500">رابط البوابة موحّد لكل العملاء. العميل يفعّل حسابه ببريده المسجّل هنا ويستلم رمز تحقق — لا توجد روابط سرية.</p>
      <div className="flex items-center gap-2">
        <input readOnly value={portalUrl} dir="ltr" className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono" />
        <button onClick={() => { navigator.clipboard.writeText(portalUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-2">{copied ? "✓" : "نسخ"}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => invite("email")} disabled={busy} className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-2 disabled:opacity-60">إرسال الدعوة بالبريد</button>
        {clientPhone && <button onClick={() => invite("sms")} disabled={busy} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-2 disabled:opacity-60">إرسال SMS</button>}
        {clientPhone && (
          <a href={`https://wa.me/${clientPhone.replace(/\D/g, "").replace(/^0/, "966")}?text=${encodeURIComponent(`مرحباً، يمكنك متابعة قضاياك عبر بوابة العملاء: ${portalUrl}\nفعّل حسابك ببريدك المسجّل لدينا.`)}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-2">واتساب</a>
        )}
      </div>
      {msg && <p className={`text-xs rounded-lg px-3 py-2 ${msg.ok ? "bg-primary-50 text-primary-700" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}
      {existingToken && <p className="text-[11px] text-gray-400">ملاحظة: الروابط القديمة الخاصة بالعميل لم تعد تعمل بدون تسجيل دخول.</p>}
    </section>
  );
}
