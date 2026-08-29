"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StaffUser = { id: string; name: string; managerId: string | null };

export default function ConsultationAssignment({
  consultationId,
  currentUserId,
  currentUserIsPartner,
  assignedToId,
  assignedToName,
  managerApprovedByName,
  managerApprovedAt,
}: {
  consultationId: string;
  currentUserId: string;
  currentUserIsPartner: boolean;
  assignedToId: string | null;
  assignedToName: string | null;
  managerApprovedByName: string | null;
  managerApprovedAt: string | null;
}) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [selected, setSelected] = useState(assignedToId ?? "");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users/basic")
      .then((r) => r.json())
      .then((data) => setStaff(Array.isArray(data) ? data : []));
  }, []);

  const assignedUser = staff.find((u) => u.id === assignedToId);
  const needsApproval = !!assignedUser?.managerId;
  const isTheManager = assignedUser?.managerId === currentUserId;
  const canApprove = needsApproval && !managerApprovedByName && (isTheManager || currentUserIsPartner);

  async function saveAssignment() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/consultation-requests/${consultationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: selected || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر حفظ التخصيص");
      return;
    }
    router.refresh();
  }

  async function approve() {
    setApproving(true);
    setError("");
    const res = await fetch(`/api/consultation-requests/${consultationId}/approve`, { method: "POST" });
    setApproving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر الاعتماد");
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
      <h2 className="font-bold text-ink mb-1">التخصيص والاعتماد</h2>

      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">بدون موظف مسؤول محدد</option>
          {staff.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <button
          onClick={saveAssignment}
          disabled={saving || selected === (assignedToId ?? "")}
          className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {saving ? "..." : "حفظ"}
        </button>
      </div>

      {assignedToName && (
        <div className="text-sm">
          {managerApprovedByName ? (
            <p className="text-primary-700">
              ✓ معتمدة من {managerApprovedByName}
              {managerApprovedAt && ` بتاريخ ${new Date(managerApprovedAt).toLocaleDateString("ar-SA")}`}
            </p>
          ) : needsApproval ? (
            <p className="text-amber-700">⏳ بانتظار اعتماد مدير {assignedToName}</p>
          ) : (
            <p className="text-gray-400">لا يحتاج اعتماد (الموظف بلا مدير مباشر محدد)</p>
          )}
        </div>
      )}

      {canApprove && (
        <button
          onClick={approve}
          disabled={approving}
          className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {approving ? "..." : "✓ اعتماد الاستشارة"}
        </button>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </div>
  );
}
