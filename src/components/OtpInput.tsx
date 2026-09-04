"use client";

export default function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="••••••"
      dir="ltr"
      disabled={disabled}
      className="w-full text-center text-3xl tracking-[0.6em] font-bold rounded-xl border-2 border-gray-300 focus:border-primary-600 px-3 py-3 outline-none"
      maxLength={6}
      autoFocus
    />
  );
}
