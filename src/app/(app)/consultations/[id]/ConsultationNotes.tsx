"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Note = { id: string; note: string; authorName: string; createdAt: string };

export default function ConsultationNotes({ consultationId, notes }: { consultationId: string; notes: Note[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    await fetch(`/api/consultation-requests/${consultationId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: text }),
    });
    setSaving(false);
    setText("");
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-3">ملاحظات داخلية</h2>

      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="أضف ملاحظة..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "..." : "إضافة"}
        </button>
      </form>

      <div className="space-y-3">
        {notes.length === 0 && <p className="text-sm text-gray-400">لا توجد ملاحظات بعد.</p>}
        {notes.map((n) => (
          <div key={n.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
            <p className="text-sm text-ink">{n.note}</p>
            <p className="text-xs text-gray-400 mt-1">
              {n.authorName} · {new Date(n.createdAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
