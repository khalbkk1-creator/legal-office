"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; fromClient: boolean; message: string; createdAt: string };

export default function CaseMessages({ caseId, messages }: { caseId: string; messages: Message[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    await fetch(`/api/cases/${caseId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    setSending(false);
    setText("");
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-4">رسائل العميل</h2>

      <div className="space-y-3 mb-4">
        {messages.length === 0 && <p className="text-sm text-gray-400">لا توجد رسائل بعد.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.fromClient ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                m.fromClient ? "bg-gray-100 text-ink" : "bg-primary-700 text-white"
              }`}
            >
              <p>{m.message}</p>
              <p className={`text-[10px] mt-1 ${m.fromClient ? "text-gray-400" : "text-primary-100"}`}>
                {m.fromClient ? "العميل" : "المحامي"} ·{" "}
                {new Date(m.createdAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب ردك..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {sending ? "..." : "إرسال"}
        </button>
      </form>
    </div>
  );
}
