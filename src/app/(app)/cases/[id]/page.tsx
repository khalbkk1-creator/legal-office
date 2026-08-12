import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AddHearingForm from "./AddHearingForm";
import AddUpdateForm from "./AddUpdateForm";
import CaseDocuments from "./CaseDocuments";
import CaseActions from "./CaseActions";
import HearingItem from "./HearingItem";

const statusLabels: Record<string, { label: string; color: string }> = {
  UNDER_REVIEW: { label: "تحت الدراسة", color: "bg-blue-50 text-blue-700" },
  UNDER_APPROVAL: { label: "تحت الاعتماد", color: "bg-purple-50 text-purple-700" },
  ACTIVE: { label: "جارية", color: "bg-primary-50 text-primary-700" },
  ON_HOLD: { label: "معلقة", color: "bg-amber-50 text-amber-700" },
  CLOSED: { label: "مغلقة", color: "bg-red-50 text-red-600" },
};

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role ?? "";

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
        <div className="flex items-center gap-4">
          <Link href={`/cases/${item.id}/edit`} className="text-sm text-primary-700 hover:underline">
            ✏️ تعديل القضية
          </Link>
          <Link href="/cases" className="text-sm text-primary-700 hover:underline">
            ← رجوع للقضايا
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard title="بيانات العميل">
          <Row label="الاسم" value={item.client.name} />
          <Row label="الجوال" value={item.client.phone ?? "—"} />
        </InfoCard>
        <InfoCard title="بيانات القضية">
          <Row label="نوع القضية" value={item.caseType} />
          <Row label="المحامي المسؤول" value={item.lawyer?.name ?? "غير معيّن"} />
          <Row label="المحكمة" value={item.court ?? "—"} />
          <Row label="الطرف الآخر" value={item.opposingParty ?? "—"} />
          <Row label="قيمة المطالبة" value={item.claimValue ? `${item.claimValue.toLocaleString()} ر.س` : "—"} />
          {item.appealDeadline && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">آخر موعد للاستئناف</span>
              <span className={appealBadge(item.appealDeadline).className}>
                {new Date(item.appealDeadline).toLocaleDateString("ar-SA")} ({appealBadge(item.appealDeadline).label})
              </span>
            </div>
          )}
        </InfoCard>
      </div>

      <CaseActions caseId={item.id} status={item.status} userRole={userRole} />

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
            <HearingItem
              key={h.id}
              caseId={item.id}
              defaultCourt={item.court}
              hearing={{
                id: h.id,
                date: h.date.toISOString(),
                court: h.court,
                roundNumber: h.roundNumber,
                notes: h.notes,
                outcome: h.outcome,
                reportUrl: h.reportUrl,
                reportName: h.reportName,
              }}
            />
          ))}
        </div>
        <AddHearingForm caseId={item.id} />
      </div>

      <CaseDocuments caseId={item.id} />

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

function appealBadge(deadline: Date | string) {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "انتهى الموعد", className: "font-medium text-red-600" };
  if (days === 0) return { label: "اليوم آخر موعد", className: "font-medium text-red-600" };
  if (days <= 7) return { label: `باقي ${days} يوم`, className: "font-medium text-red-600" };
  if (days <= 14) return { label: `باقي ${days} يوم`, className: "font-medium text-amber-600" };
  return { label: `باقي ${days} يوم`, className: "font-medium text-ink" };
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
