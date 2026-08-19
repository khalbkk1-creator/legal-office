"use client";

import { useState } from "react";
import QuoteResponse from "./QuoteResponse";
import PortalUpload from "./PortalUpload";
import ServiceRequestUpload from "./ServiceRequestUpload";
import ClarificationReply from "./ClarificationReply";
import PortalMessages from "./PortalMessages";
import NewRequestForm from "./NewRequestForm";

const statusLabels: Record<string, { label: string; color: string }> = {
  UNDER_REVIEW: { label: "تحت الدراسة", color: "bg-blue-50 text-blue-700" },
  UNDER_APPROVAL: { label: "تحت الاعتماد", color: "bg-purple-50 text-purple-700" },
  ACTIVE: { label: "جارية", color: "bg-primary-50 text-primary-700" },
  ON_HOLD: { label: "معلقة", color: "bg-amber-50 text-amber-700" },
  CLOSED: { label: "مغلقة", color: "bg-red-50 text-red-600" },
};

const quoteStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "بانتظار ردك", color: "bg-amber-50 text-amber-700" },
  ACCEPTED: { label: "تمت الموافقة", color: "bg-primary-50 text-primary-700" },
  REJECTED: { label: "مرفوض", color: "bg-red-50 text-red-600" },
  EXPIRED: { label: "منتهي الصلاحية", color: "bg-gray-100 text-gray-600" },
};

const paymentLabels: Record<string, { label: string; color: string }> = {
  PAID: { label: "مدفوعة", color: "bg-primary-50 text-primary-700" },
  UNPAID: { label: "غير مدفوعة", color: "bg-red-50 text-red-600" },
  PARTIAL: { label: "مدفوعة جزئياً", color: "bg-amber-50 text-amber-700" },
};

type Screen = "menu" | "cases" | "consultations" | "requests" | "quotes" | "invoices";

export default function PortalTabs({
  token,
  cases,
  serviceRequests,
  consultationRequests,
  quotations,
  sales,
  allCategories,
  rates,
  availability,
}: {
  token: string;
  cases: any[];
  serviceRequests: any[];
  consultationRequests: any[];
  quotations: any[];
  sales: any[];
  allCategories: { id: string; name: string }[];
  rates: { PHONE: number; IN_PERSON: number; WRITTEN: number };
  availability: { days: number[]; startTime: string; endTime: string };
}) {
  const [screen, setScreen] = useState<Screen>("menu");

  const pendingRequests = serviceRequests.filter((r) => r.status !== "CONVERTED");
  const docsNeeded = serviceRequests.filter((r) => r.status === "DOCS_REQUESTED" || r.status === "DOCS_SUBMITTED");

  const menuItems: { key: Screen; label: string; icon: string; badge?: number }[] = [
    { key: "cases", label: "قضاياك", icon: "📁", badge: cases.length || undefined },
    { key: "consultations", label: "استشاراتك", icon: "💬", badge: consultationRequests.length || undefined },
    { key: "requests", label: "طلباتك", icon: "📋", badge: pendingRequests.length || undefined },
    { key: "quotes", label: "عروض الأسعار", icon: "📝", badge: quotations.length || undefined },
    { key: "invoices", label: "فواتيرك", icon: "💰", badge: sales.length || undefined },
  ];

  if (screen === "menu") {
    return (
      <div className="max-w-md mx-auto space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setScreen(item.key)}
            className="w-full flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-primary-300 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="font-bold text-ink">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {!!item.badge && (
                <span className="text-xs bg-primary-50 text-primary-700 rounded-full px-2 py-0.5 font-medium">
                  {item.badge}
                </span>
              )}
              <span className="text-gray-300 text-lg">‹</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  const titles: Record<Screen, string> = {
    menu: "",
    cases: "قضاياك",
    consultations: "استشاراتك",
    requests: "طلباتك",
    quotes: "عروض الأسعار",
    invoices: "فواتيرك",
  };

  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={() => setScreen("menu")}
        className="flex items-center gap-1.5 text-sm text-primary-700 font-medium mb-4 hover:underline"
      >
        <span>›</span> رجوع للقائمة
      </button>

      <h2 className="text-lg font-bold text-ink mb-4 text-center">{titles[screen]}</h2>

      {screen === "cases" && (
        <div className="space-y-4">
          {cases.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-ink">{c.title}</p>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[c.status].color}`}>
                  {statusLabels[c.status].label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{c.caseNumber} · {c.caseType}</p>

              {c.hearings.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">آخر الجلسات</p>
                  {c.hearings.map((h: any) => (
                    <div key={h.id} className="mb-1">
                      <p className="text-xs text-gray-600">
                        {new Date(h.date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                        {h.court ? ` — ${h.court}` : ""}
                      </p>
                      {h.reportUrl && (
                        <a href={h.reportUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-700 hover:underline">
                          📄 {h.reportName || "تقرير الجلسة"}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {c.documents.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">المرفقات</p>
                  <div className="flex flex-wrap gap-2">
                    {c.documents.map((d: any) => (
                      <a
                        key={d.id}
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-700 hover:underline bg-primary-50 rounded-lg px-2 py-1"
                      >
                        📄 {d.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <PortalUpload token={token} caseId={c.id} />
              <PortalMessages
                token={token}
                caseId={c.id}
                messages={c.messages.map((m: any) => ({
                  id: m.id,
                  fromClient: m.fromClient,
                  message: m.message,
                  createdAt: m.createdAt,
                }))}
              />
            </div>
          ))}
          {cases.length === 0 && <p className="text-sm text-gray-400 text-center py-8">لا توجد قضايا مسجّلة بعد.</p>}
        </div>
      )}

      {screen === "consultations" && (
        <div className="space-y-3">
          {consultationRequests.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-ink">
                  {c.consultationType === "PHONE" ? "📞 استشارة هاتفية" : c.consultationType === "IN_PERSON" ? "🏢 استشارة حضورية" : c.consultationType === "WRITTEN" ? "✍️ استشارة كتابية" : "استشارة"}
                </p>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                  c.status === "CONFIRMED" ? "bg-primary-50 text-primary-700" :
                  c.status === "DONE" ? "bg-gray-100 text-gray-600" :
                  c.status === "CANCELLED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                }`}>
                  {c.status === "CONFIRMED" ? "مؤكدة" : c.status === "DONE" ? "منتهية" : c.status === "CANCELLED" ? "ملغاة" : "بانتظار المراجعة"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {new Date(c.requestedDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                {" — "}
                {new Date(c.requestedDate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {c.responseFileUrl && (
                <a
                  href={c.responseFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-700 hover:underline bg-primary-50 rounded-lg px-2 py-1 inline-block"
                >
                  📄 {c.responseFileName || "رد الاستشارة"}
                </a>
              )}
            </div>
          ))}
          {consultationRequests.length === 0 && <p className="text-sm text-gray-400 text-center py-8">لا توجد استشارات مسجّلة بعد.</p>}
        </div>
      )}

      {screen === "requests" && (
        <div className="space-y-6">
          <NewRequestForm token={token} rates={rates} availability={availability} />

          {pendingRequests.length > 0 && (
            <div>
              <h3 className="font-bold text-ink mb-3 text-sm">طلباتك الحالية</h3>
              <div className="space-y-2">
                {pendingRequests.map((r) => {
                  const statusMap: Record<string, { label: string; color: string }> = {
                    NEW: { label: "بانتظار المراجعة", color: "bg-amber-50 text-amber-700" },
                    DOCS_REQUESTED: { label: "مطلوب منك مستندات/توضيح", color: "bg-amber-50 text-amber-700" },
                    DOCS_SUBMITTED: { label: "بانتظار المراجعة", color: "bg-blue-50 text-blue-700" },
                    QUOTE_SENT: { label: "عرض سعر بانتظار ردك", color: "bg-purple-50 text-purple-700" },
                    ACCEPTED: { label: "تمت الموافقة", color: "bg-primary-50 text-primary-700" },
                    REJECTED: { label: "مرفوض", color: "bg-red-50 text-red-600" },
                  };
                  const s = statusMap[r.status] ?? { label: r.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{r.requestType === "CASE" ? "طلب قضية" : "طلب استشارة"}</p>
                        <p className="text-xs text-gray-400 truncate max-w-xs">{r.notes}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${s.color}`}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {docsNeeded.length > 0 && (
            <div>
              <h3 className="font-bold text-ink mb-3 text-sm">مستندات مطلوبة منك</h3>
              <div className="space-y-3">
                {docsNeeded.map((r) => {
                  const reqCategories = allCategories.filter((c) => r.requestedCategoryIds.includes(c.id));
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      {reqCategories.length > 0 && (
                        <p className="text-sm font-medium text-ink mb-2">
                          المستندات المطلوبة: {reqCategories.map((c) => c.name).join("، ")}
                        </p>
                      )}
                      {reqCategories.length > 0 && (
                        <ServiceRequestUpload token={token} requestId={r.id} categories={reqCategories} />
                      )}
                      {r.clarificationRequest && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-ink mb-1">📩 {r.clarificationRequest}</p>
                          <ClarificationReply token={token} requestId={r.id} existingReply={r.clientReply} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pendingRequests.length === 0 && docsNeeded.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد طلبات حالية.</p>
          )}
        </div>
      )}

      {screen === "quotes" && (
        <div className="space-y-3">
          {quotations.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-ink">{q.quoteNumber}</p>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${quoteStatusLabels[q.status].color}`}>
                  {quoteStatusLabels[q.status].label}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{q.description}</p>
              <p className="text-sm font-bold text-primary-700 mb-2">{q.totalAmount.toLocaleString()} ر.س</p>
              {q.status === "PENDING" && <QuoteResponse token={token} quoteId={q.id} />}
            </div>
          ))}
          {quotations.length === 0 && <p className="text-sm text-gray-400 text-center py-8">لا توجد عروض أسعار حالياً.</p>}
        </div>
      )}

      {screen === "invoices" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-4 py-2 font-medium">رقم الفاتورة</th>
                <th className="text-right px-4 py-2 font-medium">الوصف</th>
                <th className="text-right px-4 py-2 font-medium">المبلغ</th>
                <th className="text-right px-4 py-2 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-gray-50">
                  <td className="px-4 py-2 font-medium text-ink">{s.invoiceNumber}</td>
                  <td className="px-4 py-2 text-gray-600">{s.description}</td>
                  <td className="px-4 py-2 text-ink">{s.totalAmount.toLocaleString()} ر.س</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${paymentLabels[s.paymentStatus].color}`}>
                      {paymentLabels[s.paymentStatus].label}
                    </span>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">لا توجد فواتير بعد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
