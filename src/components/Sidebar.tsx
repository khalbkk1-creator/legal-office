"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "الرئيسية", icon: "🏠" },
    { href: "/cases", label: "القضايا", icon: "⚖️" },
    { href: "/clients", label: "العملاء", icon: "👥" },
    { href: "/hearings", label: "الجلسات", icon: "📅" },
    ...(userRole === "PARTNER" ? [{ href: "/users", label: "المستخدمون", icon: "🔑" }] : []),
  ];

  const roleLabels: Record<string, string> = {
    PARTNER: "شريك",
    LAWYER: "محامي",
    SECRETARY: "سكرتير",
  };

  return (
    <aside className="w-64 bg-white border-l border-gray-200 h-screen sticky top-0 flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold">
            م
          </div>
          <div>
            <p className="text-sm font-bold text-ink">مكتب المحاماة</p>
            <p className="text-xs text-gray-400">نظام الإدارة</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-primary-700 text-white"
                  : "text-gray-600 hover:bg-primary-50 hover:text-primary-800"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-ink truncate">{userName}</p>
          <p className="text-xs text-gray-400">{roleLabels[userRole] ?? userRole}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-right px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

