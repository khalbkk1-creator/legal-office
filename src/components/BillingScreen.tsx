"use client";

import { useState } from "react";
import Link from "next/link";
import MarkPaidButton from "@/app/(app)/sales/MarkPaidButton";
import QuoteActions from "@/app/(app)/quotes/QuoteActions";

type Sale = {
  id: string;
  invoiceNumber: string;
  description: string;
  totalAmount: number;
  paymentStatus: string;
  client: { name: string };
  case: { id: string; caseNumber: string } | null;
};

type Quote = {
  id: string;
  quoteNumber: string;
  description: string;
  totalAmount: number;
  status: string;
  convertedSaleId: string | null;
  client: { name: string };
  case: { id: string; caseNumber: string } | null;
};

const saleStatusLabels: Record<string, { label: string; color: string }> = {
  PAID: { label: "مدفوعة", color: "bg-primary-50 text-primary-700" },
  UNPAID: { label: "غير مدفوعة", color: "bg-red-50 text-red-600" },
  PARTIAL: { label: "مدفوعة جزئياً", color: "bg-amber-50 text-amber-700" },
};

const quoteStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "بانتظار الرد", color: "bg-amber-50 text-amber-700" },
  ACCEPTED: { label: "مقبول", color: "bg-primary-50 text-primary-700" },
  REJECTED: { label: "مرفوض", color: "bg-red-50 text-red-600" },
  EXPIRED: { label: "منتهي الصلاحية", color: "bg-gray-100 text-gray-600" },
};

export default function BillingScreen({
  initialTab,
  sales,
  quotes,
  summary,
}: {
  initialTab: "sales" | "quotes";
  sales: Sale[];
  quotes: Quote[];
  summary: { totalThisMonth: number; totalOutstanding: number; topCases: { title: string; total: number }[] };
}) {
  const [tab, setTab] = useState<"sales" | "quotes">(initialTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">المبيعات وعروض الأسعار</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === "sales" ? "فواتير الخدمات والإيرادات" : "عروض قبل تحويلها إلى فواتير"}
          </p>
        </div>
        <Link
          href={tab === "sales" ? "/sales/new" : "/quotes/new"}
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          {tab === "sales" ? "+ فاتورة جديدة" : "+ عرض سعر جديد"}
        </Link>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("sales")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "sales" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          💰 الفواتير
        </button>
        <button
          onClick={() => setTab("quotes")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "quotes" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📝 عروض الأسعار
        </button>
      </div>

      {tab === "sales" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-1">مبيعات هذا الشهر</p>
              <p className="text-2xl font-bold text-ink">{summary.totalThisMonth.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-1">إجمالي المستحق</p>
              <p className="text-2xl font-bold text-red-600">{summary.totalOutstanding.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-2">أعلى القضايا إيراداً</p>
              {summary.topCases.length === 0 ? (
                <p className="text-xs text-gray-400">لا توجد بيانات بعد</p>
              ) : (
                <div className="space-y-1">
                  {summary.topCases.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate">{c.title}</span>
                      <span className="text-ink font-medium">{c.total.toLocaleString()} ر.س</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-right px-5 py-3 font-medium">رقم الفاتورة</th>
                  <th className="text-right px-5 py-3 font-medium">العميل</th>
                  <th className="text-right px-5 py-3 font-medium">القضية</th>
                  <th className="text-right px-5 py-3 font-medium">الوصف</th>
                  <th className="text-right px-5 py-3 font-medium">الإجمالي</th>
                  <th className="text-right px-5 py-3 font-medium">الحالة</th>
                  <th className="text-right px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
                    <td className="px-5 py-3 font-medium text-ink">{s.invoiceNumber}</td>
                    <td className="px-5 py-3 text-gray-600">{s.client.name}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {s.case ? (
                        <Link href={`/cases/${s.case.id}`} className="text-primary-700 hover:underline">
                          {s.case.caseNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.description}</td>
                    <td className="px-5 py-3 text-ink font-medium">{s.totalAmount.toLocaleString()} ر.س</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${saleStatusLabels[s.paymentStatus].color}`}>
                        {saleStatusLabels[s.paymentStatus].label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {s.paymentStatus !== "PAID" && <MarkPaidButton saleId={s.id} totalAmount={s.totalAmount} />}
                        <Link href={`/sales/${s.id}/edit`} className="text-xs text-primary-700 hover:underline">
                          تعديل
                        </Link>
                        <Link href={`/print/sales/${s.id}`} target="_blank" className="text-xs text-gray-500 hover:underline">
                          طباعة
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                      لا توجد فواتير مسجّلة بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "quotes" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-5 py-3 font-medium">رقم العرض</th>
                <th className="text-right px-5 py-3 font-medium">العميل</th>
                <th className="text-right px-5 py-3 font-medium">القضية</th>
                <th className="text-right px-5 py-3 font-medium">الوصف</th>
                <th className="text-right px-5 py-3 font-medium">الإجمالي</th>
                <th className="text-right px-5 py-3 font-medium">الحالة</th>
                <th className="text-right px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
                  <td className="px-5 py-3 font-medium text-ink">{q.quoteNumber}</td>
                  <td className="px-5 py-3 text-gray-600">{q.client.name}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {q.case ? (
                      <Link href={`/cases/${q.case.id}`} className="text-primary-700 hover:underline">
                        {q.case.caseNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{q.description}</td>
                  <td className="px-5 py-3 text-ink font-medium">{q.totalAmount.toLocaleString()} ر.س</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${quoteStatusLabels[q.status].color}`}>
                      {quoteStatusLabels[q.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <QuoteActions quoteId={q.id} status={q.status} converted={!!q.convertedSaleId} />
                      <Link href={`/quotes/${q.id}/edit`} className="text-xs text-primary-700 hover:underline">
                        تعديل
                      </Link>
                      <Link href={`/print/quotes/${q.id}`} target="_blank" className="text-xs text-gray-500 hover:underline">
                        طباعة
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                    لا توجد عروض أسعار مسجّلة بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
