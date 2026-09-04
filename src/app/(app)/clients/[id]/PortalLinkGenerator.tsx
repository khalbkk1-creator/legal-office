"use client";

import { useState } from "react";

// البوابة العامة: رابط واحد للجميع، التسجيل ذاتي بتحقق من البريد
export default function PortalLinkGenerator({ clientId, existingToken, clientPhone }: { clientId: string; existingToken: string | null; clientPhone: string | null }) {
  const [copied, setCopied] = useState(false);
  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";
  const share = `مرحباً، يمكنك متابعة قضاياك ومستنداتك والتواصل معنا عبر بوابة العملاء:\n${portalUrl}\nسجّل ببريدك الإلكتروني وسيصلك رمز التحقق.`;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-ink">رابط بوابة العملاء</h2>
      <p className="text-xs text-gray-500">رابط عام واحد لكل العملاء. العميل يسجّل بنفسه ببريده، ويصله رمز تحقق. لو بريده مسجّل هنا، يُربط حسابه بقضاياه تلقائياً.</p>
      <div className="flex items-center gap-2">
        <input readOnly value={portalUrl} dir="ltr" className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono" />
        <button onClick={() => { navigator.clipboard.writeText(portalUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-2">{copied ? "✓" : "نسخ"}</button>
        {clientPhone && (
          <a href={`https://wa.me/${clientPhone.replace(/\D/g, "").replace(/^0/, "966")}?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-2">واتساب</a>
        )}
      </div>
      {existingToken && <p className="text-[11px] text-gray-400">الروابط الخاصة القديمة لم تعد تعمل بدون تسجيل دخول.</p>}
    </section>
  );
}
