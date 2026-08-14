"use client";

import { useRouter } from "next/navigation";

export default function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      className="border-t border-gray-50 hover:bg-primary-50/30 transition cursor-pointer"
    >
      {children}
    </tr>
  );
}
