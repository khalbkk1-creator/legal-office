"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; fromClient: boolean; message: string; createdAt: string };

export default function PortalMessages({
  token,
  caseId,
  messages,
}: {
  token: string;
  caseId: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    await fetch(`/api/portal/${token}/cases/${caseId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    setSending(false);
    setText("");
    router.refresh();
  }

  return (
    <div className="mt-3 border-t border-gray-50 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-primary-700 font-medium hover:underline"
      >
        💬 الملاحظات والاستفسارات ({messages.length}) {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {messages.length === 0 && <p className="text-xs text-gray-400">ما فيه رسائل بعد.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.fromClient ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs ${
                    m.fromClient ? "bg-primary-700 text-white" : "bg-gray-100 text-ink"
                  }`}
                >
                  <p>{m.message}</p>
                  <p className={`text-[10px] mt-0.5 ${m.fromClient ? "text-primary-100" : "text-gray-400"}`}>
                    {m.fromClient ? "أنت" : "المكتب"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={send} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب ملاحظتك أو استفسارك..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {sending ? "..." : "إرسال"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
