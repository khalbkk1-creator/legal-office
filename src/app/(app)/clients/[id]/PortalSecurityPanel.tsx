"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Log = { id: string; event: string; ip: string | null; userAgent: string | null; path: string | null; detail: string | null; createdAt: string };

const EVENT: Record<string, { label: string; tone: string }> = {
  LINK_ACCESS: { label: "دخول بالرابط", tone: "text-gray-600" },
  LOGIN_SUCCESS: { label: "تسجيل دخول ناجح", tone: "text-primary-700" },
  LOGIN_FAILED: { label: "محاولة دخول فاشلة", tone: "text-amber-600" },
  LOCKED: { label: "قُفل الحساب", tone: "text-red-600" },
  UNLOCKED: { label: "فُك القفل", tone: "text-primary-700" },
  REGISTER: { label: "تفعيل الحساب", tone: "text-primary-700" },
  PROFILE_UPDATE: { label: "تعديل البيانات", tone: "text-gray-600" },
  LINK_ISSUED: { label: "إصدار رابط", tone: "text-blue-700" },
  LINK_REVOKED: { label: "إلغاء الرابط", tone: "text-red-600" },
  PORTAL_DISABLED: { label: "تعطيل البوابة", tone: "text-red-600" },
  PORTAL_ENABLED: { label: "تفعيل البوابة", tone: "text-primary-700" },
};

function device(ua: string | null) {
  if (!ua) return "—";
  if (/iPhone|iPad/i.test(ua)) return "iPhone/iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS/i.test(ua)) return "Mac";
  return "متصفح";
}

export default function PortalSecurityPanel({ clientId, portalDisabled, lockedUntil, tokenExpiresAt, hasToken, logs }: {
  clientId: string; portalDisabled: boolean; lockedUntil: string | null; tokenExpiresAt: string | null; hasToken: boolean; logs: Log[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const locked = !!lockedUntil && new Date(lockedUntil) > new Date();
  const expired = !!tokenExpiresAt && new Date(tokenExpiresAt) < new Date();
  const failed24h = logs.filter((l) => l.event === "LOGIN_FAILED" && Date.now() - new Date(l.createdAt).getTime() < 86400000).length;

  async function call(init: RequestInit, ok: string) {
    setBusy(true); setMsg("");
    const res = await fetch(`/api/clients/${clientId}/portal-link`, init);
    setBusy(false);
    if (!res.ok) return setMsg("تعذر التنفيذ");
    setMsg(ok); router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">حماية البوابة</h2>
          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${portalDisabled ? "bg-red-50 text-red-600" : "bg-primary-50 text-primary-700"}`}>
            {portalDisabled ? "معطّلة" : "مفعّلة"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">رابط الدعوة</p>
            <p className={`font-medium ${!hasToken ? "text-gray-400" : expired ? "text-red-600" : "text-ink"}`}>
              {!hasToken ? "لا يوجد" : expired ? "منتهي" : tokenExpiresAt ? `ساري حتى ${new Date(tokenExpiresAt).toLocaleDateString("ar-SA")}` : "ساري (بدون انتهاء)"}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">حالة الدخول</p>
            <p className={`font-medium ${locked ? "text-red-600" : failed24h ? "text-amber-600" : "text-ink"}`}>
              {locked ? `مقفل حتى ${new Date(lockedUntil!).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}` : failed24h ? `${failed24h} محاولة فاشلة خلال 24 ساعة` : "طبيعية"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {hasToken && (
            <button onClick={() => { if (confirm("إلغاء الرابط الحالي؟ لن يعمل الرابط المُرسل سابقاً.")) call({ method: "DELETE" }, "تم إلغاء الرابط"); }} disabled={busy}
              className="text-xs bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-lg px-3 py-1.5 disabled:opacity-60">إلغاء الرابط</button>
          )}
          {locked && (
            <button onClick={() => call({ method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unlock: true }) }, "تم فك القفل")} disabled={busy}
              className="text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-1.5 disabled:opacity-60">فك القفل</button>
          )}
          <button onClick={() => { if (confirm(portalDisabled ? "تفعيل وصول العميل للبوابة؟" : "تعطيل وصول العميل للبوابة بالكامل؟ سيُقطع أي دخول فوراً.")) call({ method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portalDisabled: !portalDisabled }) }, portalDisabled ? "تم تفعيل البوابة" : "تم تعطيل البوابة"); }} disabled={busy}
            className={`text-xs rounded-lg px-3 py-1.5 disabled:opacity-60 ${portalDisabled ? "bg-primary-700 hover:bg-primary-800 text-white" : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"}`}>
            {portalDisabled ? "تفعيل البوابة" : "تعطيل البوابة"}
          </button>
          {msg && <span className="text-xs text-primary-700">{msg}</span>}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-ink">سجل الوصول (آخر 30)</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-4 py-2 font-medium">الحدث</th>
              <th className="text-right px-4 py-2 font-medium">الوقت</th>
              <th className="text-right px-4 py-2 font-medium">الجهاز</th>
              <th className="text-right px-4 py-2 font-medium">IP</th>
              <th className="text-right px-4 py-2 font-medium">تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-gray-50">
                <td className={`px-4 py-2 font-medium ${EVENT[l.event]?.tone ?? "text-gray-600"}`}>{EVENT[l.event]?.label ?? l.event}</td>
                <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-2 text-gray-600 text-xs">{device(l.userAgent)}</td>
                <td className="px-4 py-2 text-gray-500 text-xs font-mono" dir="ltr">{l.ip ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{l.detail ?? l.path ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">لا يوجد نشاط بعد.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
