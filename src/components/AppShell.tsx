"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

const roleLabels: Record<string, string> = {
  PARTNER: "شريك",
  LAWYER: "محامي",
  SECRETARY: "سكرتير",
};

export default function AppShell({
  userName,
  userRole,
  children,
}: {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const initials = (userName || "؟").trim().slice(0, 1);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-[3px] bg-gradient-to-l from-primary-800 via-primary-500 to-accent-400" />
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-sm border-b border-gray-100 shadow-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-card flex items-center justify-center shrink-0 hover:border-primary-300 hover:shadow-elevated transition"
            title="الرئيسية"
          >
            <span className="text-lg">🏠</span>
          </Link>
          <GlobalSearch />
          <NotificationBell />
          {userName && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 pr-1 rounded-full hover:bg-gray-100/70 transition py-1 pl-2"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-card">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col leading-tight text-right">
                  <span className="text-sm font-medium text-ink">{userName}</span>
                  {userRole && (
                    <span className="text-[11px] text-gray-400">{roleLabels[userRole] ?? userRole}</span>
                  )}
                </div>
                <span className="hidden sm:inline text-gray-300 text-xs">▾</span>
              </button>

              {menuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl border border-gray-100 shadow-elevated overflow-hidden animate-fade-up z-30">
                  <div className="px-4 py-3 border-b border-gray-50 sm:hidden">
                    <p className="text-sm font-medium text-ink">{userName}</p>
                    {userRole && <p className="text-[11px] text-gray-400">{roleLabels[userRole] ?? userRole}</p>}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-right px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    🚪 تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-up">{children}</main>
    </div>
  );
}
