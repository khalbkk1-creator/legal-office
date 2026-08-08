import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import AddHearingForm from "./AddHearingForm";
import AddUpdateForm from "./AddUpdateForm";

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "مفتوحة", color: "bg-amber-50 text-amber-700" },
  ACTIVE: { label: "جارية", color: "bg-primary-50 text-primary-700" },
  ON_HOLD: { label: "متوقفة", color: "bg-gray-100 text-gray-600" },
  CLOSED: { label: "منتهية", color: "bg-red-50 text-red-600" },
};

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const item = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      lawyer: true,
      hearings: { orderBy: { date: "asc" } },
      updates: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!item) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-ink">{item.title}</h1>
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusLabels[item.status].color}`}>
              {statusLabels[item.status].label}
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            رقم القضية: {item.caseNumber} · {item.caseType}
          </p>
        </div>
        <Link href="/cases" className="text-sm text-primary-700 hover:underline">
          ← رجوع للقضايا
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard title="بيانات العميل">
          <Row label="الاسم" value={item.client.name} />
          <Row label="الجوال" value={item.client.phone ?? "—"} />
        </InfoCard>
        <InfoCard title="بيانات القضية">
          <Row label="المحامي المسؤول" value={item.lawyer?.name ?? "غير معيّن"} />
          <Row label="المحكمة" value={item.court ?? "—"} />
          <Row label="الطرف الآخر" value={item.opposingParty ?? "—"} />
          <Row label="قيمة المطالبة" value={item.claimValue ? `${item.claimValue.toLocaleString()} ر.س` : "—"} />
        </InfoCard>
      </div>

      {item.description && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-ink mb-2">وصف القضية</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-4">الجلسات</h2>
        <div className="space-y-3 mb-5">
          {item.hearings.length === 0 && (
            <p className="text-sm text-gray-400">لا توجد جلسات مسجّلة لهذه القضية.</p>
          )}
          {item.hearings.map((h) => (
            <div key={h.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-3 last:pb-0">
              <div>
                <p className="text-sm font-medium text-ink">
                  {h.roundNumber ? `الجلسة رقم ${h.roundNumber}` : "جلسة"} — {h.court ?? item.court ?? "—"}
                </p>
                {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
              </div>
              <p className="text-sm text-primary-700 font-medium whitespace-nowrap">
                {new Date(h.date).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
        <AddHearingForm caseId={item.id} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-ink mb-4">سجل المتابعة</h2>
        <div className="space-y-3 mb-5">
          {item.updates.length === 0 && (
            <p className="text-sm text-gray-400">لا توجد ملاحظات مسجّلة بعد.</p>
          )}
          {item.updates.map((u) => (
            <div key={u.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
              <p className="text-sm text-ink">{u.note}</p>
              <p className="text-xs text-gray-400 mt-1">
                {u.author.name} · {new Date(u.createdAt).toLocaleDateString("ar-SA")}
              </p>
            </div>
          ))}
        </div>
        <AddUpdateForm caseId={item.id} />
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}
