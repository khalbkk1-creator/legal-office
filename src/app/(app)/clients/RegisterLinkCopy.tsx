"use client";

import { useEffect, useState } from "react";

export default function RegisterLinkCopy() {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(`${window.location.origin}/register`);
  }, []);

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
      <span className="text-xs text-gray-400 whitespace-nowrap">رابط تسجيل العملاء:</span>
      <input readOnly value={link} className="text-xs text-gray-600 bg-transparent border-none outline-none flex-1" dir="ltr" />
      <button onClick={copy} className="text-xs text-primary-700 font-medium hover:underline whitespace-nowrap">
        {copied ? "تم النسخ ✓" : "نسخ الرابط"}
      </button>
    </div>
  );
}
