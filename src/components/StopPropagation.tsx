"use client";

export default function StopPropagation({ children }: { children: React.ReactNode }) {
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-block">
      {children}
    </span>
  );
}
