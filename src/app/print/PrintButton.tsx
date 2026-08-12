"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium fixed top-6 left-6 shadow-lg"
    >
      🖨️ طباعة
    </button>
  );
}
