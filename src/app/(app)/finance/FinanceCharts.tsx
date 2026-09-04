"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from "recharts";

const MIX_COLORS = ["#1f5348", "#2f7a68", "#4a9d88", "#7bbfae", "#a8d5c9", "#c9a227", "#d9d9d9"];
const money = (v: number) => `${Number(v).toLocaleString()} ر.س`;

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid #e3e8e6", fontSize: 12, direction: "rtl" as const },
  labelStyle: { color: "#5b6663", marginBottom: 4 },
};

export default function FinanceCharts({
  months,
  expenseMix,
  aging,
}: {
  months: { label: string; revenue: number; expense: number; net: number }[];
  expenseMix: { name: string; value: number }[];
  aging: { name: string; value: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-ink">الإيرادات والمصاريف — آخر 12 شهر</h2>
        </div>
        <div className="p-3 h-72" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={months} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f7a68" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2f7a68" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7774" }} axisLine={false} tickLine={false} reversed />
              <YAxis tick={{ fontSize: 11, fill: "#6b7774" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => Number(v).toLocaleString()} orientation="right" />
              <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [money(v), n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke="#2f7a68" strokeWidth={2} fill="url(#revFill)" />
              <Bar dataKey="expense" name="المصاريف" fill="#e5766f" radius={[4, 4, 0, 0]} barSize={14} />
              <Line type="monotone" dataKey="net" name="الصافي" stroke="#c9a227" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-ink">مزيج المصاريف</h2>
        </div>
        <div className="p-3 h-72" dir="ltr">
          {expenseMix.length === 0 ? (
            <p className="text-sm text-gray-400 text-center pt-24">لا توجد مصاريف مرحّلة.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {expenseMix.map((_, i) => (
                    <Cell key={i} fill={MIX_COLORS[i % MIX_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [money(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-ink">أعمار الذمم المدينة</h2>
        </div>
        <div className="p-3 h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aging} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7774" }} axisLine={false} tickLine={false} reversed />
              <YAxis tick={{ fontSize: 11, fill: "#6b7774" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => Number(v).toLocaleString()} orientation="right" />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [money(v), "المستحق"]} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                {aging.map((a, i) => (
                  <Cell key={i} fill={a.name === "أكثر من 90" ? "#dc2626" : a.name === "61-90" ? "#ea9a3e" : "#2f7a68"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
