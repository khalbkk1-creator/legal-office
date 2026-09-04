import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FinanceCharts from "./FinanceCharts";

export const dynamic = "force-dynamic";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date) {
  return d.toLocaleDateString("ar-SA", { month: "short" });
}

export default async function FinancePage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [accounts, lines12, sales, timeEntries, caseExpenseLines, openPayables] = await Promise.all([
    prisma.account.findMany({ select: { id: true, code: true, name: true, type: true } }),
    prisma.journalEntryLine.findMany({
      where: { journalEntry: { status: "POSTED", date: { gte: start12 } } },
      select: {
        debit: true,
        credit: true,
        accountId: true,
        journalEntry: { select: { date: true } },
      },
    }),
    prisma.sale.findMany({
      include: { client: { select: { id: true, name: true } }, case: { select: { id: true, title: true, caseNumber: true } } },
    }),
    prisma.timeEntry.findMany({ include: { lawyer: { select: { id: true, name: true } }, case: { select: { id: true, title: true, caseNumber: true } } } }),
    prisma.expense.findMany({ where: { caseId: { not: null } }, select: { amount: true, caseId: true } }),
    prisma.paymentRequest.findMany({ where: { status: { in: ["APPROVED", "PAID"] } }, select: { amount: true, status: true, invoiceUrl: true } }),
  ]);

  const byId = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const isRevenue = (id: string) => byId[id]?.type === "REVENUE";
  const isExpense = (id: string) => byId[id]?.type === "EXPENSE";
  const isCash = (id: string) => {
    const a = byId[id];
    return !!a && a.type === "ASSET" && a.code.startsWith("10") && a.code !== "1100";
  };

  // اتجاه 12 شهر من القيود المرحّلة
  const months: { key: string; label: string; revenue: number; expense: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    months.push({ key: monthKey(d), label: monthLabel(d), revenue: 0, expense: 0 });
  }
  const monthIndex = Object.fromEntries(months.map((m, i) => [m.key, i]));
  let cashIn12 = 0;
  let cashOut12 = 0;
  for (const l of lines12) {
    const k = monthKey(l.journalEntry.date);
    const idx = monthIndex[k];
    if (idx === undefined) continue;
    if (isRevenue(l.accountId)) months[idx].revenue += l.credit - l.debit;
    if (isExpense(l.accountId)) months[idx].expense += l.debit - l.credit;
    if (isCash(l.accountId)) {
      cashIn12 += l.debit;
      cashOut12 += l.credit;
    }
  }

  const cur = months[11];
  const prev = months[10] ?? { revenue: 0, expense: 0 };
  const ytdRevenue = months.filter((m) => m.key >= monthKey(startOfYear)).reduce((s, m) => s + m.revenue, 0);
  const ytdExpense = months.filter((m) => m.key >= monthKey(startOfYear)).reduce((s, m) => s + m.expense, 0);
  const pct = (a: number, b: number) => (b === 0 ? null : ((a - b) / Math.abs(b)) * 100);

  // الوضع النقدي (كل التاريخ)
  const cashAgg = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: { journalEntry: { status: "POSTED" }, accountId: { in: accounts.filter((a) => isCash(a.id)).map((a) => a.id) } },
    _sum: { debit: true, credit: true },
  });
  const cashBalance = cashAgg.reduce((s, x) => s + (x._sum.debit ?? 0) - (x._sum.credit ?? 0), 0);

  // الذمم والتحصيل
  const totalBilled = sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalCollected = sales.reduce((s, x) => s + x.paidAmount, 0);
  const receivable = totalBilled - totalCollected;
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  const last90 = new Date(now.getTime() - 90 * 86400000);
  const billed90 = sales.filter((s) => s.saleDate >= last90).reduce((s, x) => s + x.totalAmount, 0);
  const dso = billed90 > 0 ? Math.round((receivable / billed90) * 90) : 0;

  const aging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 } as Record<string, number>;
  for (const s of sales) {
    const rem = s.totalAmount - s.paidAmount;
    if (rem <= 0.01) continue;
    const days = Math.floor((now.getTime() - s.saleDate.getTime()) / 86400000);
    if (days <= 30) aging["0-30"] += rem;
    else if (days <= 60) aging["31-60"] += rem;
    else if (days <= 90) aging["61-90"] += rem;
    else aging["90+"] += rem;
  }

  // الالتزامات المعتمدة غير المسددة (توقّع الخروج النقدي)
  const committedOut = openPayables.filter((p) => p.status === "APPROVED").reduce((s, x) => s + x.amount, 0);

  // مزيج المصاريف حسب الحساب (آخر 12 شهر)
  const expenseByAccount: Record<string, number> = {};
  for (const l of lines12) {
    if (!isExpense(l.accountId)) continue;
    const name = byId[l.accountId]?.name ?? "غير مصنّف";
    expenseByAccount[name] = (expenseByAccount[name] ?? 0) + (l.debit - l.credit);
  }
  const expenseMix = Object.entries(expenseByAccount)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // أعلى العملاء
  const byClient: Record<string, { name: string; billed: number; outstanding: number }> = {};
  for (const s of sales) {
    const k = s.client.id;
    if (!byClient[k]) byClient[k] = { name: s.client.name, billed: 0, outstanding: 0 };
    byClient[k].billed += s.totalAmount;
    byClient[k].outstanding += s.totalAmount - s.paidAmount;
  }
  const topClients = Object.entries(byClient)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.billed - a.billed)
    .slice(0, 6);

  // ربحية القضايا: الفواتير − مصاريف القضية − تكلفة الوقت (بسعر الساعة المسجل)
  const caseAgg: Record<string, { title: string; caseNumber: string; revenue: number; expense: number; timeCost: number; unbilledTime: number }> = {};
  const ensure = (id: string, title: string, num: string) => {
    if (!caseAgg[id]) caseAgg[id] = { title, caseNumber: num, revenue: 0, expense: 0, timeCost: 0, unbilledTime: 0 };
    return caseAgg[id];
  };
  for (const s of sales) if (s.case) ensure(s.case.id, s.case.title, s.case.caseNumber).revenue += s.totalAmount;
  for (const e of caseExpenseLines) if (e.caseId) {
    const c = caseAgg[e.caseId];
    if (c) c.expense += e.amount;
  }
  for (const t of timeEntries) {
    if (!t.case) continue;
    const c = ensure(t.case.id, t.case.title, t.case.caseNumber);
    const value = (t.minutes / 60) * t.hourlyRate;
    c.timeCost += value;
    if (!t.billed) c.unbilledTime += value;
  }
  const caseProfit = Object.entries(caseAgg)
    .map(([id, v]) => ({ id, ...v, net: v.revenue - v.expense - v.timeCost, margin: v.revenue > 0 ? ((v.revenue - v.expense - v.timeCost) / v.revenue) * 100 : 0 }))
    .sort((a, b) => b.net - a.net);
  const topProfit = caseProfit.slice(0, 5);
  const lossCases = caseProfit.filter((c) => c.net < 0).slice(0, 5);
  const unbilledTotal = timeEntries.filter((t) => !t.billed).reduce((s, t) => s + (t.minutes / 60) * t.hourlyRate, 0);

  // إنتاجية المحامين
  const byLawyer: Record<string, { name: string; hours: number; billedHours: number; value: number }> = {};
  for (const t of timeEntries) {
    const k = t.lawyer.id;
    if (!byLawyer[k]) byLawyer[k] = { name: t.lawyer.name, hours: 0, billedHours: 0, value: 0 };
    const h = t.minutes / 60;
    byLawyer[k].hours += h;
    byLawyer[k].value += h * t.hourlyRate;
    if (t.billed) byLawyer[k].billedHours += h;
  }
  const lawyers = Object.values(byLawyer).sort((a, b) => b.value - a.value).slice(0, 6);

  const kpis = [
    { label: "إيراد الشهر", value: cur.revenue, delta: pct(cur.revenue, prev.revenue), money: true },
    { label: "مصاريف الشهر", value: cur.expense, delta: pct(cur.expense, prev.expense), money: true, invert: true },
    { label: "صافي الشهر", value: cur.revenue - cur.expense, delta: pct(cur.revenue - cur.expense, prev.revenue - prev.expense), money: true },
    { label: "النقد المتاح", value: cashBalance, money: true },
    { label: "الذمم المدينة", value: receivable, money: true, invert: true },
    { label: "متوسط أيام التحصيل", value: dso, suffix: " يوم" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">اللوحة المالية</h1>
          <p className="text-gray-500 text-sm mt-1">مؤشرات الأداء المالي — مصدر البيانات: القيود المرحّلة</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reports" className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-2">التقارير المالية</Link>
          <Link href="/accounting?tab=aging" className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2">أعمار الديون</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-xl font-bold text-ink tabular-nums mt-1">
              {Math.round(k.value).toLocaleString()}
              {k.money ? <span className="text-xs font-normal text-gray-400"> ر.س</span> : k.suffix ?? ""}
            </p>
            {k.delta !== null && k.delta !== undefined && isFinite(k.delta) && (
              <p className={`text-[11px] mt-0.5 ${(k.invert ? -k.delta : k.delta) >= 0 ? "text-primary-700" : "text-red-600"}`}>
                {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta).toFixed(1)}% عن الشهر الماضي
              </p>
            )}
          </div>
        ))}
      </div>

      <FinanceCharts
        months={months.map((m) => ({ label: m.label, revenue: Math.round(m.revenue), expense: Math.round(m.expense), net: Math.round(m.revenue - m.expense) }))}
        expenseMix={expenseMix}
        aging={Object.entries(aging).map(([name, value]) => ({ name: name === "90+" ? "أكثر من 90" : name, value: Math.round(value) }))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="من بداية السنة">
          <Row label="الإيرادات" value={`${Math.round(ytdRevenue).toLocaleString()} ر.س`} />
          <Row label="المصاريف" value={`${Math.round(ytdExpense).toLocaleString()} ر.س`} />
          <Row label="صافي الربح" value={`${Math.round(ytdRevenue - ytdExpense).toLocaleString()} ر.س`} strong tone={ytdRevenue - ytdExpense >= 0 ? "text-primary-700" : "text-red-600"} />
          <Row label="هامش الربح" value={ytdRevenue > 0 ? `${(((ytdRevenue - ytdExpense) / ytdRevenue) * 100).toFixed(1)}%` : "—"} />
        </Card>
        <Card title="التحصيل">
          <Row label="إجمالي الفواتير" value={`${Math.round(totalBilled).toLocaleString()} ر.س`} />
          <Row label="المحصّل" value={`${Math.round(totalCollected).toLocaleString()} ر.س`} />
          <Row label="نسبة التحصيل" value={`${collectionRate.toFixed(1)}%`} strong tone={collectionRate >= 80 ? "text-primary-700" : "text-amber-600"} />
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min(100, collectionRate)}%` }} />
          </div>
        </Card>
        <Card title="توقّع الحركة النقدية">
          <Row label="النقد الحالي" value={`${Math.round(cashBalance).toLocaleString()} ر.س`} />
          <Row label="متوقع تحصيله (ذمم)" value={`+ ${Math.round(receivable).toLocaleString()} ر.س`} tone="text-primary-700" />
          <Row label="التزامات معتمدة" value={`− ${Math.round(committedOut).toLocaleString()} ر.س`} tone="text-red-600" />
          <Row label="الصافي المتوقع" value={`${Math.round(cashBalance + receivable - committedOut).toLocaleString()} ر.س`} strong />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="أعلى العملاء" action={<Link href="/clients" className="text-xs text-primary-700 hover:underline">كل العملاء</Link>}>
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs">
              <tr>
                <th className="text-right py-1.5 font-medium">العميل</th>
                <th className="text-right py-1.5 font-medium">الفواتير</th>
                <th className="text-right py-1.5 font-medium">المستحق</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((c) => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-2"><Link href={`/clients/${c.id}`} className="text-ink hover:text-primary-700">{c.name}</Link></td>
                  <td className="py-2 tabular-nums">{Math.round(c.billed).toLocaleString()}</td>
                  <td className={`py-2 tabular-nums ${c.outstanding > 0 ? "text-red-600" : "text-gray-400"}`}>{c.outstanding > 0 ? Math.round(c.outstanding).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {topClients.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-gray-400">لا توجد بيانات.</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card title="إنتاجية المحامين" action={<span className="text-xs text-gray-400">وقت غير مفوتر: {Math.round(unbilledTotal).toLocaleString()} ر.س</span>}>
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs">
              <tr>
                <th className="text-right py-1.5 font-medium">المحامي</th>
                <th className="text-right py-1.5 font-medium">الساعات</th>
                <th className="text-right py-1.5 font-medium">نسبة الفوترة</th>
                <th className="text-right py-1.5 font-medium">القيمة</th>
              </tr>
            </thead>
            <tbody>
              {lawyers.map((l, i) => {
                const rate = l.hours > 0 ? (l.billedHours / l.hours) * 100 : 0;
                return (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="py-2 text-ink">{l.name}</td>
                    <td className="py-2 tabular-nums">{l.hours.toFixed(1)}</td>
                    <td className={`py-2 tabular-nums ${rate >= 70 ? "text-primary-700" : "text-amber-600"}`}>{rate.toFixed(0)}%</td>
                    <td className="py-2 tabular-nums">{Math.round(l.value).toLocaleString()}</td>
                  </tr>
                );
              })}
              {lawyers.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">لا توجد ساعات مسجّلة.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="أعلى القضايا ربحية" action={<span className="text-xs text-gray-400">الإيراد − المصاريف − تكلفة الوقت</span>}>
          <CaseProfitTable rows={topProfit} />
        </Card>
        <Card title="قضايا بهامش سالب" action={<span className="text-xs text-gray-400">تحتاج مراجعة تسعير</span>}>
          {lossCases.length ? <CaseProfitTable rows={lossCases} /> : <p className="text-sm text-gray-400 py-6 text-center">لا توجد قضايا خاسرة 🎉</p>}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Row({ label, value, strong = false, tone = "text-ink" }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex justify-between text-sm py-1 ${strong ? "border-t border-gray-100 mt-1 pt-2" : ""}`}>
      <span className="text-gray-500">{label}</span>
      <span className={`${strong ? "font-bold" : "font-medium"} tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

function CaseProfitTable({ rows }: { rows: { id: string; title: string; caseNumber: string; revenue: number; net: number; margin: number; unbilledTime: number }[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-gray-500 text-xs">
        <tr>
          <th className="text-right py-1.5 font-medium">القضية</th>
          <th className="text-right py-1.5 font-medium">الإيراد</th>
          <th className="text-right py-1.5 font-medium">الصافي</th>
          <th className="text-right py-1.5 font-medium">الهامش</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id} className="border-t border-gray-50">
            <td className="py-2">
              <Link href={`/cases/${c.id}`} className="text-ink hover:text-primary-700">{c.title}</Link>
              <span className="block text-[11px] text-gray-400 font-mono" dir="ltr">{c.caseNumber}</span>
              {c.unbilledTime > 0 && <span className="block text-[11px] text-amber-600">وقت غير مفوتر: {Math.round(c.unbilledTime).toLocaleString()} ر.س</span>}
            </td>
            <td className="py-2 tabular-nums">{Math.round(c.revenue).toLocaleString()}</td>
            <td className={`py-2 tabular-nums font-medium ${c.net >= 0 ? "text-primary-700" : "text-red-600"}`}>{Math.round(c.net).toLocaleString()}</td>
            <td className={`py-2 tabular-nums ${c.margin >= 0 ? "text-gray-700" : "text-red-600"}`}>{c.revenue > 0 ? `${c.margin.toFixed(0)}%` : "—"}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">لا توجد بيانات كافية.</td></tr>}
      </tbody>
    </table>
  );
}
