"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalLinkGenerator({
  clientId,
  existingToken,
}: {
  clientId: string;
  existingToken: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = existingToken && typeof window !== "undefined" ? `${window.location.origin}/portal/${existingToken}` : "";

  async function generate() {
    setLoading(true);
    await fetch(`/api/clients/${clientId}/portal-link`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-ink mb-3">بوابة العميل</h2>
      <p className="text-xs text-gray-400 mb-4">
        رابط خاص يقدر العميل يفتحه مباشرة ويشوف قضاياه وفواتيره ومرفقاته بدون تسجيل دخول.
      </p>

      {existingToken ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 bg-gray-50"
            />
            <button
              onClick={copyLink}
              className="text-xs bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-3 py-2 whitespace-nowrap"
            >
              {copied ? "تم النسخ ✓" : "نسخ الرابط"}
            </button>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs text-red-600 hover:underline disabled:opacity-60"
          >
            {loading ? "جاري التحديث..." : "توليد رابط جديد (يلغي القديم)"}
          </button>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "جاري التوليد..." : "توليد رابط للعميل"}
        </button>
      )}
    </div>
  );
}
