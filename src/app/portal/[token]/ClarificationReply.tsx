"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClarificationReply({
  token,
  requestId,
  existingReply,
}: {
  token: string;
  requestId: string;
  existingReply: string | null;
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    await fetch(`/api/portal/${token}/service-requests/${requestId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    });
    setSending(false);
    setReply("");
    router.refresh();
  }

  if (existingReply) {
    return (
      <div className="mt-2 bg-primary-50 rounded-lg p-2 text-xs text-primary-800">
        <span className="font-medium">ردك:</span> {existingReply}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        placeholder="اكتب ردك هنا..."
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
      />
      <button
        onClick={send}
        disabled={sending}
        className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-1.5 disabled:opacity-60"
      >
        {sending ? "..." : "إرسال الرد"}
      </button>
    </div>
  );
}
