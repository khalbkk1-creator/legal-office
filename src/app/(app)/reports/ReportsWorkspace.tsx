"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
  periodValue: number;
  prevValue: number;
};

type Data = { from: string; to: string; cmpFrom: string; cmpTo: string; rows: Row[] };

const REPORTS = [
  { key: "income", label: "قائمة الدخل" },
  { key: "balance", label: "الميزانية العمومية" },
  { key: "trial", label: "ميزان المراجعة" },
  { key: "vat", label: "الإقرار الضريبي" },
] as const;
type ReportKey = (typeof REPORTS)[number]["key"];

const fmt = (n: number) => Math.round(n).toLocaleString();
const iso = (d: Date) => d.toISOString().slice(0, 10);

function presets() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  return [
    { label: "هذا الشهر", from: iso(new Date(y, m, 1)), to: iso(now) },
    { label: "الشهر الماضي", from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
    { label: "هذا الربع", from: iso(new Date(y, q * 3, 1)), to: iso(now) },
    { label: "من بداية السنة", from: iso(new Date(y, 0, 1)), to: iso(now) },
    { label: "السنة الماضية", from: iso(new Date(y - 1, 0, 1)), to: iso(new Date(y - 1, 11, 31)) },
  ];
}

export default function ReportsWorkspace() {
  const p = presets();
  const [from, setFrom] = useState(p[3].from);
  const [to, setTo] = useState(p[3].to);
  const [report, setReport] = useState<ReportKey>("income");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/financials?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [from, to]);

  const rows = data?.rows ?? [];
  const of = (t: string) => rows.filter((r) => r.type === t);
  const sum = (list: Row[], k: "periodValue" | "prevValue" = "periodValue") => list.reduce((s, r) => s + r[k], 0);

  const revenue = of("REVENUE");
  const expense = of("EXPENSE");
  const asset = of("ASSET");
  const liability = of("LIABILITY");
  const equity = of("EQUITY");

  const netIncome = sum(revenue) - sum(expense);
  const netPrev = sum(revenue, "prevValue") - sum(expense, "prevValue");

  const periodLabel = useMemo(() => {
    if (!data) return "";
    const f = new Date(data.from).toLocaleDateString("ar-SA");
    const t = new Date(data.to).toLocaleDateString("ar-SA");
    return `${f} — ${t}`;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">التقارير المالية</h1>
          <p className="text-gray-500 text-sm mt-1">{periodLabel || "اختر الفترة"} · مقارنة بالفترة السابقة المماثلة</p>
        </div>
        <button onClick={() => window.print()} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 print:hidden">
          🖨️ طباعة
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {p.map((x) => (
            <button
              key={x.label}
              onClick={() => {
                setFrom(x.from);
                setTo(x.to);
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                from === x.from && to === x.to ? "bg-ink text-white border-ink" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
              }`}
            >
              {x.label}
            </button>
          ))}
          <div className="flex items-center gap-2 mr-auto">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => setReport(r.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${report === r.key ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-12">جاري تجهيز التقرير...</p>}

      {!loading && data && report === "income" && (
        <Sheet title="قائمة الدخل" subtitle={periodLabel}>
          <CompareTable
            groups={[
              { title: "الإيرادات", rows: revenue },
              { title: "المصروفات", rows: expense },
            ]}
            footer={{ label: netIncome >= 0 ? "صافي الربح" : "صافي الخسارة", value: netIncome, prev: netPrev }}
          />
        </Sheet>
      )}

      {!loading && data && report === "balance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Sheet title="الأصول" subtitle={`كما في ${new Date(data.to).toLocaleDateString("ar-SA")}`}>
            <BalanceTable rows={asset} total={sum(asset)} />
          </Sheet>
          <Sheet title="الالتزامات وحقوق الملكية" subtitle={`كما في ${new Date(data.to).toLocaleDateString("ar-SA")}`}>
            <BalanceTable
              rows={[...liability, ...equity]}
              total={sum(liability) + sum(equity) + netIncome}
              extra={{ label: "صافي ربح الفترة", value: netIncome }}
            />
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${Math.round(sum(asset)) === Math.round(sum(liability) + sum(equity) + netIncome) ? "bg-primary-50 text-primary-800" : "bg-red-50 text-red-700"}`}>
              {Math.round(sum(asset)) === Math.round(sum(liability) + sum(equity) + netIncome)
                ? "الميزانية متوازنة ✓"
                : `غير متوازنة — فرق ${fmt(sum(asset) - (sum(liability) + sum(equity) + netIncome))} ر.س`}
            </div>
          </Sheet>
        </div>
      )}

      {!loading && data && report === "trial" && (
        <Sheet title="ميزان المراجعة" subtitle={`${periodLabel} · رصيد افتتاحي وحركة ورصيد ختامي`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-right px-3 py-2 font-medium">الرقم</th>
                  <th className="text-right px-3 py-2 font-medium">الحساب</th>
                  <th className="text-right px-3 py-2 font-medium">رصيد افتتاحي</th>
                  <th className="text-right px-3 py-2 font-medium">حركة مدين</th>
                  <th className="text-right px-3 py-2 font-medium">حركة دائن</th>
                  <th className="text-right px-3 py-2 font-medium">رصيد ختامي</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.opening !== 0 || r.debit !== 0 || r.credit !== 0)
                  .map((r) => (
                    <tr key={r.id} className="border-t border-gray-50 hover:bg-primary-50/30">
                      <td className="px-3 py-2 font-mono text-xs text-gray-500" dir="ltr">{r.code}</td>
                      <td className="px-3 py-2">
                        <Link href={`/accounting/ledger/${r.id}`} className="text-primary-700 hover:underline">{r.name}</Link>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gray-600">{fmt(r.opening)}</td>
                      <td className="px-3 py-2 tabular-nums">{r.debit ? fmt(r.debit) : "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{r.credit ? fmt(r.credit) : "—"}</td>
                      <td className="px-3 py-2 tabular-nums font-medium">{fmt(r.closing)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td className="px-3 py-3" colSpan={2}>الإجمالي</td>
                  <td className="px-3 py-3 tabular-nums">{fmt(rows.reduce((s, r) => s + r.opening, 0))}</td>
                  <td className="px-3 py-3 tabular-nums">{fmt(rows.reduce((s, r) => s + r.debit, 0))}</td>
                  <td className="px-3 py-3 tabular-nums">{fmt(rows.reduce((s, r) => s + r.credit, 0))}</td>
                  <td className="px-3 py-3 tabular-nums">{fmt(rows.reduce((s, r) => s + r.closing, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Sheet>
      )}

      {!loading && data && report === "vat" && <VatReturn rows={rows} periodLabel={periodLabel} />}
    </div>
  );
}

function Sheet({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Variance({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return <span className="text-gray-300">—</span>;
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  if (!isFinite(d)) return <span className="text-gray-300">—</span>;
  return (
    <span className={d >= 0 ? "text-primary-700" : "text-red-600"}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
    </span>
  );
}

function CompareTable({
  groups,
  footer,
}: {
  groups: { title: string; rows: Row[] }[];
  footer: { label: string; value: number; prev: number };
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th className="text-right px-3 py-2 font-medium">البند</th>
            <th className="text-right px-3 py-2 font-medium">الفترة الحالية</th>
            <th className="text-right px-3 py-2 font-medium">الفترة السابقة</th>
            <th className="text-right px-3 py-2 font-medium">التغيّر</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const t = g.rows.reduce((s, r) => s + r.periodValue, 0);
            const tp = g.rows.reduce((s, r) => s + r.prevValue, 0);
            return (
              <>
                <tr key={g.title} className="bg-gray-50/60">
                  <td className="px-3 py-2 font-semibold text-ink" colSpan={4}>{g.title}</td>
                </tr>
                {g.rows
                  .filter((r) => r.periodValue !== 0 || r.prevValue !== 0)
                  .map((r) => (
                    <tr key={r.id} className="border-t border-gray-50 hover:bg-primary-50/30">
                      <td className="px-3 py-2 pr-6">
                        <Link href={`/accounting/ledger/${r.id}`} className="text-gray-700 hover:text-primary-700">
                          <span className="font-mono text-xs text-gray-400 ml-2" dir="ltr">{r.code}</span>
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{fmt(r.periodValue)}</td>
                      <td className="px-3 py-2 tabular-nums text-gray-500">{fmt(r.prevValue)}</td>
                      <td className="px-3 py-2 text-xs"><Variance cur={r.periodValue} prev={r.prevValue} /></td>
                    </tr>
                  ))}
                <tr className="border-t border-gray-200 font-semibold">
                  <td className="px-3 py-2">إجمالي {g.title}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(t)}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-500">{fmt(tp)}</td>
                  <td className="px-3 py-2 text-xs"><Variance cur={t} prev={tp} /></td>
                </tr>
              </>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={`font-bold border-t-2 border-gray-200 ${footer.value >= 0 ? "bg-primary-50 text-primary-800" : "bg-red-50 text-red-700"}`}>
            <td className="px-3 py-3">{footer.label}</td>
            <td className="px-3 py-3 tabular-nums">{fmt(footer.value)}</td>
            <td className="px-3 py-3 tabular-nums opacity-70">{fmt(footer.prev)}</td>
            <td className="px-3 py-3 text-xs"><Variance cur={footer.value} prev={footer.prev} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BalanceTable({ rows, total, extra }: { rows: Row[]; total: number; extra?: { label: string; value: number } }) {
  const closing = (r: Row) => (r.type === "ASSET" || r.type === "EXPENSE" ? r.closing : -r.closing);
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows
          .filter((r) => closing(r) !== 0)
          .map((r) => (
            <tr key={r.id} className="border-b border-gray-50">
              <td className="py-2">
                <Link href={`/accounting/ledger/${r.id}`} className="text-gray-700 hover:text-primary-700">
                  <span className="font-mono text-xs text-gray-400 ml-2" dir="ltr">{r.code}</span>
                  {r.name}
                </Link>
              </td>
              <td className="py-2 text-left tabular-nums">{fmt(closing(r))}</td>
            </tr>
          ))}
        {extra && (
          <tr className="border-b border-gray-50">
            <td className="py-2 text-gray-700">{extra.label}</td>
            <td className="py-2 text-left tabular-nums">{fmt(extra.value)}</td>
          </tr>
        )}
        <tr className="font-bold border-t-2 border-gray-200">
          <td className="py-3">الإجمالي</td>
          <td className="py-3 text-left tabular-nums">{fmt(total)} ر.س</td>
        </tr>
      </tbody>
    </table>
  );
}

function VatReturn({ rows, periodLabel }: { rows: Row[]; periodLabel: string }) {
  // المخرجات: حركة دائن على حساب الضريبة المستحقة 2200 | المدخلات: حركة مدين عليه
  const vatAccounts = rows.filter((r) => r.code.startsWith("22") || r.name.includes("ضريبة"));
  const outputVat = vatAccounts.reduce((s, r) => s + r.credit, 0);
  const inputVat = vatAccounts.reduce((s, r) => s + r.debit, 0);
  const net = outputVat - inputVat;
  const sales = rows.filter((r) => r.type === "REVENUE").reduce((s, r) => s + r.periodValue, 0);
  const purchases = rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.periodValue, 0);

  const lines = [
    { no: 1, label: "المبيعات الخاضعة للنسبة الأساسية 15%", base: sales, vat: outputVat },
    { no: 2, label: "المبيعات الخاضعة لنسبة الصفر", base: 0, vat: 0 },
    { no: 3, label: "المبيعات المعفاة", base: 0, vat: 0 },
    { no: 4, label: "إجمالي المبيعات", base: sales, vat: outputVat, bold: true },
    { no: 5, label: "المشتريات الخاضعة للنسبة الأساسية 15%", base: purchases, vat: inputVat },
    { no: 6, label: "إجمالي المشتريات", base: purchases, vat: inputVat, bold: true },
  ];

  return (
    <Sheet title="الإقرار الضريبي — ضريبة القيمة المضافة" subtitle={`${periodLabel} · مطابق لحركة حسابات الضريبة بالدفاتر`}>
      <table className="w-full text-sm mb-6">
        <thead className="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th className="text-right px-3 py-2 font-medium w-12">#</th>
            <th className="text-right px-3 py-2 font-medium">البند</th>
            <th className="text-right px-3 py-2 font-medium">المبلغ (ر.س)</th>
            <th className="text-right px-3 py-2 font-medium">الضريبة (ر.س)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.no} className={`border-t border-gray-50 ${l.bold ? "font-semibold bg-gray-50/60" : ""}`}>
              <td className="px-3 py-2 text-gray-400 tabular-nums">{l.no}</td>
              <td className="px-3 py-2 text-ink">{l.label}</td>
              <td className="px-3 py-2 tabular-nums">{fmt(l.base)}</td>
              <td className="px-3 py-2 tabular-nums">{fmt(l.vat)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={`rounded-2xl px-6 py-5 flex items-center justify-between ${net >= 0 ? "bg-red-50" : "bg-primary-50"}`}>
        <span className={`font-bold ${net >= 0 ? "text-red-800" : "text-primary-800"}`}>
          {net >= 0 ? "صافي الضريبة المستحقة للهيئة" : "رصيد ضريبي مسترد لصالح المنشأة"}
        </span>
        <span className={`text-2xl font-extrabold tabular-nums ${net >= 0 ? "text-red-700" : "text-primary-700"}`}>{fmt(Math.abs(net))} ر.س</span>
      </div>

      <p className="text-[11px] text-gray-400 mt-4">
        الأرقام مستخرجة من حركة حسابات الضريبة بالدفاتر خلال الفترة. راجعها قبل الرفع لمنصة الهيئة.
      </p>
    </Sheet>
  );
}
