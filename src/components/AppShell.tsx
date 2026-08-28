"use client";

import Link from "next/link";
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-card flex items-center justify-center shrink-0 hover:border-primary-300 hover:shadow-sm transition"
            title="الرئيسية"
          >
            <span className="text-lg">🏠</span>
          </Link>
          <GlobalSearch />
          <NotificationBell />
          {userName && (
            <div className="flex items-center gap-2 shrink-0 pr-1">
              <div className="w-9 h-9 rounded-full bg-primary-700 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-sm font-medium text-ink">{userName}</span>
                {userRole && (
                  <span className="text-[11px] text-gray-400">{roleLabels[userRole] ?? userRole}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
